// Scheduled Function: every 30 min, check each active author for new posts.
// Inserts new posts (deduped by url), then pushes to followers.
// First run: posts older than 3 days get notified_at = now (no spam).
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { politeGet, parserFor } from './_lib/author-parsers.mjs';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const STALE_DAYS = { weekly: 10, monthly: 40, both: 10 };

export default async () => {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!url || !secret) {
    console.error('authors-check: missing SUPABASE config');
    return new Response('missing config', { status: 500 });
  }

  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date();
  const hasVapid = vapidPublic && vapidPrivate && vapidSubject;
  if (hasVapid) webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const { data: authors, error: authErr } = await supabase.from('authors').select('*').eq('active', true);
  if (authErr || !authors?.length) {
    console.warn('authors-check: no active authors', authErr);
    return new Response(JSON.stringify({ error: authErr?.message || 'no authors' }), { status: 500 });
  }

  const summary = [];

  for (const author of authors) {
    const parser = parserFor(author);
    if (!parser) {
      console.warn(`authors-check: ${author.id} skip — no parser for source_type=${author.source_type}`);
      summary.push(`${author.id} skip=no-parser`);
      continue;
    }

    let newCount = 0, errorMsg = null;
    try {
      const feedUrl = author.source_type === 'youtube'
        ? `https://www.youtube.com/feeds/videos.xml?channel_id=${author.source_id}`
        : author.feed_url;

      const { status, text, contentType, bytes } = await politeGet(feedUrl);
      console.log(`authors-check: ${author.id} HTTP ${status} content-type=${contentType} bytes=${bytes}`);

      if (status === 304) {
        await supabase.from('authors').update({ last_checked_at: now.toISOString() }).eq('id', author.id);
        summary.push(`${author.id} new=0 (304)`);
        continue;
      }
      if (!text || status >= 400) {
        const preview = (text || '').slice(0, 300);
        console.warn(`authors-check: ${author.id} bad response: HTTP ${status} preview=${preview}`);
        throw new Error(`HTTP ${status}`);
      }

      const allParsed = parser(text);
      console.log(`authors-check: ${author.id} parsed=${allParsed.length} items`);

      if (allParsed.length === 0) {
        const preview = text.slice(0, 300).replace(/\s+/g, ' ');
        console.warn(`authors-check: ${author.id} parser returned 0 items. preview=${preview}`);
      }

      for (const post of allParsed) {
        const isOld = (now - new Date(post.published_at)) > THREE_DAYS_MS;
        const { data: inserted, error: insErr } = await supabase
          .from('author_posts')
          .upsert({
            author_id: author.id,
            url: post.url,
            title: post.title,
            published_at: post.published_at,
            kind: post.kind,
            notified_at: isOld ? now.toISOString() : null,
          }, { onConflict: 'url', ignoreDuplicates: true })
          .select('id, notified_at');

        if (insErr) {
          console.warn(`authors-check: insert error for ${post.url}`, insErr.message);
          continue;
        }

        if (inserted?.length && !inserted[0].notified_at) {
          newCount++;
        }
      }

      const staleDays = STALE_DAYS[author.cadence] || 10;
      if (author.last_found_at && (now - new Date(author.last_found_at)) > staleDays * 24 * 60 * 60 * 1000) {
        console.warn(`authors-check: ${author.id} stale (no new post for >${staleDays} days)`);
      }

      await supabase.from('authors').update({
        last_checked_at: now.toISOString(),
        last_found_at: newCount > 0 ? now.toISOString() : author.last_found_at,
        last_error: null,
      }).eq('id', author.id);

    } catch (err) {
      errorMsg = err.message || String(err);
      console.warn(`authors-check: ${author.id} error:`, errorMsg);
      await supabase.from('authors').update({
        last_checked_at: now.toISOString(),
        last_error: errorMsg.slice(0, 500),
      }).eq('id', author.id);
    }

    summary.push(`${author.id} new=${newCount}${errorMsg ? ` error="${errorMsg.slice(0, 60)}"` : ''}`);
  }

  // Push notifications for un-notified posts
  let pushed = 0, held = 0, errors = 0;
  if (hasVapid) {
    const pushResult = await sendAuthorPushes(supabase, now);
    pushed = pushResult.pushed;
    held = pushResult.held;
    errors = pushResult.errors;
  }

  const log = `authors-check: ${summary.join(' | ')} pushed=${pushed} held=${held} errors=${errors}`;
  console.log(log);
  return new Response(JSON.stringify({ summary, pushed, held, errors }), {
    headers: { 'content-type': 'application/json' },
  });
};

async function sendAuthorPushes(supabase, now) {
  const { data: posts } = await supabase
    .from('author_posts')
    .select('id, author_id, title, url')
    .is('notified_at', null)
    .order('published_at', { ascending: false });

  if (!posts?.length) return { pushed: 0, held: 0, errors: 0 };

  const { data: authorRows } = await supabase.from('authors').select('id, name_zh');
  const authorNames = Object.fromEntries((authorRows || []).map(a => [a.id, a.name_zh]));

  let pushed = 0, held = 0, errors = 0;

  for (const post of posts) {
    const { data: followers } = await supabase
      .from('follows')
      .select('user_id, profiles!inner(push_enabled, authors_push_enabled, time_zone, push_time)')
      .eq('author_id', post.author_id);

    if (!followers?.length) {
      await supabase.from('author_posts').update({ notified_at: now.toISOString() }).eq('id', post.id);
      continue;
    }

    let anySent = false;
    for (const f of followers) {
      const p = f.profiles;
      if (!p.push_enabled || !p.authors_push_enabled) continue;

      const localHour = localHourIn(now, p.time_zone);
      if (localHour >= 22 || localHour < 7) { held++; continue; }

      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('user_id', f.user_id);

      if (!subs?.length) continue;

      const authorName = authorNames[post.author_id] || post.author_id;
      const payload = JSON.stringify({
        title: `${authorName} 發布了新運勢`,
        body: post.title.slice(0, 80),
        url: post.url,
        tag: `author-${post.id}`,
        lang: 'zh',
      });

      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
          pushed++;
          anySent = true;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
          errors++;
        }
      }
    }

    if (anySent || held === 0) {
      await supabase.from('author_posts').update({ notified_at: now.toISOString() }).eq('id', post.id);
    }
  }

  return { pushed, held, errors };
}

function localHourIn(date, tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).formatToParts(date);
    return parseInt(parts.find(p => p.type === 'hour').value, 10);
  } catch {
    return 12;
  }
}

export const config = { schedule: '*/30 * * * *' };
