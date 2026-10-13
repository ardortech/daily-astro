// Scheduled Function: at 00:00 Asia/Taipei, write today's row to daily_sky.
// Taiwan has no DST, so 00:00 Taipei is always 16:00 UTC (Netlify cron is UTC).
// Uses SUPABASE_SECRET_KEY, which bypasses RLS: server-side only, never VITE_-prefixed.
import { createClient } from '@supabase/supabase-js';
import { dailySky, dateIn } from '../../src/astro/index.js';

export default async () => {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    console.error('daily-sky: SUPABASE_URL / VITE_SUPABASE_URL or SUPABASE_SECRET_KEY is not set');
    return new Response('missing configuration', { status: 500 });
  }
  // A few minutes of slack so a run that fires a little early still writes the new day.
  const date = dateIn(new Date(Date.now() + 5 * 60e3), 'Asia/Taipei');
  const row = dailySky(date, 'Asia/Taipei');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.from('daily_sky').upsert(row, { onConflict: 'date' });
  if (error) {
    console.error('daily-sky: upsert failed', error);
    return new Response(error.message, { status: 500 });
  }
  console.log('daily-sky', JSON.stringify(row));
  return new Response(JSON.stringify(row), { headers: { 'content-type': 'application/json' } });
};

export const config = { schedule: '0 16 * * *' };
