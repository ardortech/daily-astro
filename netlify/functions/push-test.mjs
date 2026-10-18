// POST /api/push/test — send a test push to the caller's own devices.
// Rate-limited: max 3 per hour per user.
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export default async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!url || !secret || !vapidPublic || !vapidPrivate || !vapidSubject) {
    return new Response(JSON.stringify({ error: 'missing config' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });

  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return new Response(JSON.stringify({ error: 'invalid token' }), { status: 401, headers: { 'content-type': 'application/json' } });

  const oneHourAgo = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await supabase.from('push_log')
    .select('user_id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('kind', 'test')
    .gte('sent_at', oneHourAgo);
  if (count >= 3) {
    return new Response(JSON.stringify({ error: 'rate limit: max 3 test pushes per hour' }), { status: 429, headers: { 'content-type': 'application/json' } });
  }

  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', user.id);
  if (!subs?.length) {
    return new Response(JSON.stringify({ error: 'no subscriptions found' }), { status: 404, headers: { 'content-type': 'application/json' } });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const lang = subs[0].lang || 'zh';
  const payload = JSON.stringify({
    title: lang === 'en' ? 'Test push from Daily Astro' : '吉光測試推播',
    body: lang === 'en' ? 'Your push notifications are working!' : '推播通知設定成功！',
    tag: 'test',
    url: '/?from=push',
    lang,
  });

  let sent = 0, failed = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      sent++;
      await supabase.from('push_subscriptions').update({ last_success_at: new Date().toISOString(), fail_count: 0 }).eq('id', sub.id);
    } catch (err) {
      failed++;
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      }
    }
  }

  const now = new Date();
  const localDate = now.toISOString().slice(0, 10);
  await supabase.from('push_log').upsert(
    { user_id: user.id, local_date: localDate, kind: 'test', sent_at: now.toISOString() },
    { onConflict: 'user_id,local_date,kind', ignoreDuplicates: false },
  );

  return new Response(JSON.stringify({ sent, failed }), { headers: { 'content-type': 'application/json' } });
};

export const config = { path: '/api/push/test' };
