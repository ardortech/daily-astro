// POST /api/push/unsubscribe — remove a push subscription.
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
  if (!body.endpoint) return new Response(JSON.stringify({ error: 'missing endpoint' }), { status: 400, headers: { 'content-type': 'application/json' } });

  await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', body.endpoint);

  const { count } = await supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  if (count === 0) {
    await supabase.from('profiles').update({ push_enabled: false }).eq('user_id', user.id);
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};

export const config = { path: '/api/push/unsubscribe' };
