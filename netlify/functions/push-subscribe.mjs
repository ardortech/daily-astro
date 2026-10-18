// POST /api/push/subscribe — register or update a push subscription.
// Requires a Supabase JWT (anonymous auth).
import { createClient } from '@supabase/supabase-js';

export default async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return new Response('missing config', { status: 500 });

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });

  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return new Response(JSON.stringify({ error: 'invalid token' }), { status: 401, headers: { 'content-type': 'application/json' } });

  const body = await req.json();
  const { endpoint, p256dh, auth, lang, user_agent, time_zone } = body;
  if (!endpoint || !p256dh || !auth) {
    return new Response(JSON.stringify({ error: 'missing fields' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint,
    p256dh,
    auth,
    lang: lang === 'en' ? 'en' : 'zh',
    user_agent: (user_agent || '').slice(0, 500),
    fail_count: 0,
  }, { onConflict: 'endpoint' });

  if (error) {
    console.error('push-subscribe: upsert failed', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }

  if (time_zone) {
    await supabase.from('profiles').update({ push_enabled: true, time_zone }).eq('user_id', user.id);
  } else {
    await supabase.from('profiles').update({ push_enabled: true }).eq('user_id', user.id);
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};

export const config = { path: '/api/push/subscribe' };
