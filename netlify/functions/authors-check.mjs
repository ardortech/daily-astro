// Scheduled Function: every 30 min, check each active author for new posts.
// Inserts new posts (deduped by url), then pushes to followers.
// First run: posts older than 3 days get notified_at = now (no spam).
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { politeGet, parseTang, parseMafalda, parseSusan } from './_lib/author-parsers.mjs';

const PARSERS = { tang: parseTang, mafalda: parseMafalda, susan: parseSusan };
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

  // Get active authors
  const { data: authors, error: authErr } = await supabase.from('authors').select('*').eq('active', true);
  if (authErr || !authors?.length) {
    console.warn('authors-check: no active authors', authErr);
    return new Response(JSON.stringify({ error: authErr?.message || 'no authors' }), { status: 500 });
  }

  const summary = [];

  for (const author of authors) {
    const parser = PARSERS[author.id];
    if (!parser) { summary.push(`${author.id} skip=no-parser`); continue; }

    let newCount = 0, errorMsg = null;
    try {
      const { status, text } = await politeGet(author.feed_url);
      if (status === 304) {
        await supabase.from('authors').update({ last_checked_at: now.toISOString() }).eq('id', author.id);
        summary.push(`${author.id} new=0 (304)`);
        continue;
      }
      if (!text || status >= 400) throw new Error(`HTTP ${status}`);

      const posts = parser(text);
      if (posts.length === 0) {
        console.warn(`authors-check: ${author.id} parser returned 0 items`);
      }

      // Dedupe: only insert posts whose url isn't already stored
      for (const post of posts) {
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

        // If newly inserted (not a duplicate) and not old, it needs notification
        if (inserted?.length && !inserted[0].notified_at) {
          newCount++;
        }
      }

      // Check staleness
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

  const log = `authors-check: ${summary.join(' ')} pushed=${pushed} held=${held} errors=${errors}`;
  console.log(log);
  return new Response(JSON.stringify({ summary, pushed, held, errors }), {
    headers: { 'content-type': 'application/json' },
  });
};

async function sendAuthorPushes(supabase, now) {
  // Find posts that need notification (notified_at is null)
  const { data: posts } = await supabase
    .from('author_posts')
    .select('id, author_id, title, url')
    .is('notified_at', null)
    .order('published_at', { ascending: false });

  if (!posts?.length) return { pushed: 0, held: 0, errors: 0 };

  // Get author names
  const { data: authorRows } = await supabase.from('authors').select('id, name_zh');
  const authorNames = Object.fromEntries((authorRows || []).map(a => [a.id, a.name_zh]));

  let pushed = 0, held = 0, errors = 0;

  for (const post of posts) {
    // Find followers of this author with push enabled + authors_push_enabled
    const { data: followers } = await supabase
      .from('follows')
      .select('user_id, profiles!inner(push_enabled, authors_push_enabled, time_zone, push_time)')
      .eq('author_id', post.author_id);

    if (!followers?.length) {
      // No followers, mark as notified so we don't keep checking
      await supabase.from('author_posts').update({ notified_at: now.toISOString() }).eq('id', post.id);
      continue;
    }

    let anySent = false;
    for (const f of followers) {
      const p = f.profiles;
      if (!p.push_enabled || !p.authors_push_enabled) continue;

      // Quiet hours: 22:00–07:00 in user's time zone
      const localHour = localHourIn(now, p.time_zone);
      if (localHour >= 22 || localHour < 7) {
        held++;
        // Will be picked up on next run when it's no longer quiet hours
        continue;
      }

      // Send push
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

    // Mark as notified if all non-quiet-hours users have been processed
    // (quiet-hours users will get it on next run when their local time is past 07:00)
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
