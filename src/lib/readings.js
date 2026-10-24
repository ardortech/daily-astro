import { useEffect, useState } from 'preact/hooks';

let _sb;
async function sb() {
  if (_sb !== undefined) return _sb;
  const mod = await import('./supabase.js');
  _sb = mod.supabase;
  return _sb;
}

const cache = new Map();

export function useDailyReading(date, kind, profile) {
  const [row, setRow] = useState(null);

  const sun = kind === 'astro' ? profile?.sun ?? -1 : -1;
  const rising = kind === 'astro' ? (profile?.rising ?? -1) : -1;
  const zodiac = kind === 'zodiac' ? (profile?.zodiac ?? -1) : -1;
  const key = `${date}:${kind}:${sun}:${rising}:${zodiac}`;

  useEffect(() => {
    if (!date || !profile) return;
    if (cache.has(key)) { setRow(cache.get(key)); return; }
    let cancelled = false;
    sb().then(client => {
      if (!client || cancelled) return;
      let q = client.from('daily_readings')
        .select('headline, body, watch_out, scores')
        .eq('date', date).eq('kind', kind).eq('lang', 'zh');
      if (kind === 'astro') q = q.eq('sun', sun).eq('rising', rising);
      else q = q.eq('zodiac', zodiac);
      return q.limit(1).maybeSingle();
    }).then(res => {
      if (cancelled) return;
      const r = res?.data ?? null;
      cache.set(key, r);
      setRow(r);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [key]);

  return row;
}
