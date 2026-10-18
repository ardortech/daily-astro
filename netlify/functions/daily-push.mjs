// Scheduled Function: every 15 min, send daily push notifications.
// Selects users whose LOCAL time has reached push_time today and who haven't been sent yet.
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { dailySky, dateIn } from '../../src/astro/index.js';
import { buildPushPayload } from './_lib/push-payload.mjs';

export default async () => {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!url || !secret || !vapidPublic || !vapidPrivate || !vapidSubject) {
    console.error('daily-push: missing config');
    return new Response('missing config', { status: 500 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date();
  const t0 = Date.now();

  // Get all distinct time zones from profiles with push enabled
  const { data: zones } = await supabase
    .from('profiles')
    .select('time_zone')
    .eq('push_enabled', true)
    .or('daily_enabled.eq.true,zodiac_daily_enabled.eq.true');

  if (!zones?.length) {
    console.log('daily-push: no users with push enabled');
    return new Response(JSON.stringify({ due: 0, sent: 0, failed: 0, removed: 0 }), { headers: { 'content-type': 'application/json' } });
  }

  const uniqueZones = [...new Set(zones.map(z => z.time_zone))];

  let totalDue = 0, totalSent = 0, totalFailed = 0, totalRemoved = 0;

  for (const tz of uniqueZones) {
    const localDate = dateIn(now, tz);
    const localTime = localTimeIn(now, tz);

    // Find users in this tz whose push_time has been reached
    const { data: users } = await supabase
      .from('profiles')
      .select('user_id, sun, rising, zodiac, daily_enabled, zodiac_daily_enabled, push_time, wuxing')
      .eq('push_enabled', true)
      .eq('time_zone', tz)
      .or('daily_enabled.eq.true,zodiac_daily_enabled.eq.true')
      .lte('push_time', localTime);

    if (!users?.length) continue;

    // Filter out users who already got today's push
    const userIds = users.map(u => u.user_id);
    const { data: sent } = await supabase
      .from('push_log')
      .select('user_id')
      .in('user_id', userIds)
      .eq('local_date', localDate)
      .eq('kind', 'daily');
    const sentSet = new Set((sent || []).map(r => r.user_id));
    const due = users.filter(u => !sentSet.has(u.user_id));
    totalDue += due.length;
    if (!due.length) continue;

    // Try to get AI readings, fall back to template
    const { data: readings } = await supabase
      .from('daily_readings')
      .select('lang, kind, sun, rising, zodiac, headline, body, watch_out, scores')
      .eq('date', localDate);
    const readingMap = new Map();
    for (const r of (readings || [])) {
      const key = `${r.lang}_${r.kind}_${r.sun ?? -1}_${r.rising ?? -1}_${r.zodiac ?? -1}`;
      readingMap.set(key, r);
    }

    let skyRow;
    try { skyRow = dailySky(localDate, tz); } catch { skyRow = null; }

    // Process in batches of 10 (concurrency limit)
    for (let i = 0; i < due.length; i += 10) {
      const batch = due.slice(i, i + 10);
      const results = await Promise.allSettled(batch.map(async user => {
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('id, endpoint, p256dh, auth, lang')
          .eq('user_id', user.user_id);
        if (!subs?.length) return { sent: 0, failed: 0, removed: 0 };

        const lang = subs[0].lang || 'zh';
        const payload = buildPushPayload(user, localDate, lang, readingMap, skyRow);
        const payloadStr = JSON.stringify(payload);
        let s = 0, f = 0, r = 0;

        for (const sub of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payloadStr,
            );
            s++;
            await supabase.from('push_subscriptions')
              .update({ last_success_at: now.toISOString(), fail_count: 0 })
              .eq('id', sub.id);
          } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 410) {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
              r++;
            } else {
              f++;
              await supabase.rpc('increment_fail_count', { sub_id: sub.id }).catch(() => {
                supabase.from('push_subscriptions')
                  .update({ fail_count: (sub.fail_count || 0) + 1 })
                  .eq('id', sub.id).then(() => {});
              });
              if ((sub.fail_count || 0) + 1 >= 5) {
                await supabase.from('push_subscriptions').delete().eq('id', sub.id);
                r++;
              }
            }
          }
        }

        if (s > 0) {
          await supabase.from('push_log').upsert(
            { user_id: user.user_id, local_date: localDate, kind: 'daily', sent_at: now.toISOString() },
            { onConflict: 'user_id,local_date,kind', ignoreDuplicates: true },
          );
        }
        return { sent: s, failed: f, removed: r };
      }));

      for (const r of results) {
        if (r.status === 'fulfilled') {
          totalSent += r.value.sent;
          totalFailed += r.value.failed;
          totalRemoved += r.value.removed;
        } else {
          totalFailed++;
        }
      }
    }
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`daily-push: due=${totalDue} sent=${totalSent} failed=${totalFailed} removed=${totalRemoved} in ${elapsed}s`);
  return new Response(JSON.stringify({ due: totalDue, sent: totalSent, failed: totalFailed, removed: totalRemoved, elapsed }), {
    headers: { 'content-type': 'application/json' },
  });
};

function localTimeIn(date, tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
    const h = parts.find(p => p.type === 'hour').value;
    const m = parts.find(p => p.type === 'minute').value;
    return `${h}:${m}`;
  } catch {
    return '00:00';
  }
}

export const config = { schedule: '*/15 * * * *' };
