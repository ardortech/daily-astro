// Scheduled Function: submit a Message Batch for daily readings (336 requests).
// Runs at 00:05 Asia/Taipei (16:05 UTC), after daily-sky writes the sky row.
// Results are collected ~30 min later by daily-readings-collect.
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import {
  dailySky, dateIn, READING_TOOL, allKeys, keyId,
  SIGNS, SIGNS_EN, ANIMALS, ANIMALS_EN, ELEMENTS, ELEMENTS_EN,
  HOUSES, HOUSES_EN, ASPECTS, ASPECTS_EN, RELATIONS, RELATIONS_EN,
  JIANCHU, STEMS, BRANCHES, STEM_EL, ordinal,
} from './_lib/readings.mjs';

function buildAstroPrompt(sun, rising, skyRow, yesterday) {
  const base = rising >= 0 ? rising : sun;
  const house = (skyRow.moon_sign - base + 12) % 12;
  const sep = (skyRow.moon_sign - sun + 12) % 12;
  const aspect = Math.min(sep, 12 - sep);
  const moonSign = SIGNS[skyRow.moon_sign];
  const sunSign = SIGNS[sun];
  const risingStr = rising >= 0 ? `上升${SIGNS[rising]}座` : '上升未知';
  const antiRepeat = yesterday ? `\n昨天的標題是「${yesterday}」，請換一個角度。` : '';
  return `你是「吉光」的星座運勢撰稿人，用 zh-TW，溫暖實用、不恐嚇。
今天的天象：月亮在${moonSign}座（${skyRow.moon_lon.toFixed(1)}°），太陽在${SIGNS[skyRow.sun_sign]}座（${skyRow.sun_lon.toFixed(1)}°）。
水星${SIGNS[skyRow.mercury_sign]}座${skyRow.mercury_retro ? '（逆行）' : ''}，金星${SIGNS[skyRow.venus_sign]}座${skyRow.venus_retro ? '（逆行）' : ''}，火星${SIGNS[skyRow.mars_sign]}座${skyRow.mars_retro ? '（逆行）' : ''}。
月亮盈虧：${(skyRow.moon_illum * 100).toFixed(0)}%${skyRow.moon_waxing ? '漸盈' : '漸虧'}。
${skyRow.voc_start ? `月亮空亡期：${skyRow.voc_start} 至 ${skyRow.voc_end}。` : ''}

對象：太陽${sunSign}座，${risingStr}。
月亮落入第${house + 1}宮（${HOUSES[house]}），與太陽成${ASPECTS[aspect]}。${antiRepeat}`;
}

function buildAstroPromptEn(sun, rising, skyRow, yesterday) {
  const base = rising >= 0 ? rising : sun;
  const house = (skyRow.moon_sign - base + 12) % 12;
  const sep = (skyRow.moon_sign - sun + 12) % 12;
  const aspect = Math.min(sep, 12 - sep);
  const moonSign = SIGNS_EN[skyRow.moon_sign];
  const sunSign = SIGNS_EN[sun];
  const risingStr = rising >= 0 ? `${SIGNS_EN[rising]} rising` : 'rising unknown';
  const antiRepeat = yesterday ? `\nYesterday's headline was "${yesterday}" — use a different angle.` : '';
  return `You are the horoscope writer for "吉光" (Daily Astro). Write in English, warm and practical — never alarmist.

Today's sky: Moon in ${moonSign} (${skyRow.moon_lon.toFixed(1)}°), Sun in ${SIGNS_EN[skyRow.sun_sign]} (${skyRow.sun_lon.toFixed(1)}°).
Mercury in ${SIGNS_EN[skyRow.mercury_sign]}${skyRow.mercury_retro ? ' (retrograde)' : ''}, Venus in ${SIGNS_EN[skyRow.venus_sign]}${skyRow.venus_retro ? ' (retrograde)' : ''}, Mars in ${SIGNS_EN[skyRow.mars_sign]}${skyRow.mars_retro ? ' (retrograde)' : ''}.
Moon illumination: ${(skyRow.moon_illum * 100).toFixed(0)}% ${skyRow.moon_waxing ? 'waxing' : 'waning'}.
${skyRow.voc_start ? `Void-of-course Moon: ${skyRow.voc_start} to ${skyRow.voc_end}.` : ''}

Subject: ${sunSign} Sun, ${risingStr}.
Moon in the ${ordinal(house + 1)} house (${HOUSES_EN[house]}), ${ASPECTS_EN[aspect]} to the Sun.${antiRepeat}`;
}

function buildZodiacPrompt(zodiac, skyRow, yesterday) {
  const db = skyRow.day_branch;
  const ds = skyRow.day_stem;
  const dayGz = `${STEMS[ds]}${BRANCHES[db]}`;
  const dayEl = ELEMENTS[STEM_EL[ds]];
  const diff = (db - zodiac + 12) % 12;
  const relIdx = diff === 6 ? 6 : diff === 0 ? 2 : diff === 4 || diff === 8 ? 1 : 3;
  const antiRepeat = yesterday ? `\n昨天的標題是「${yesterday}」，請換一個角度。` : '';
  return `你是「吉光」的生肖運勢撰稿人，用 zh-TW，溫暖實用、不恐嚇。
今天：${dayGz}日，${dayEl}氣，${JIANCHU[skyRow.jianchu]}日。
宜：${skyRow.yi.join('、')}。忌：${skyRow.ji.join('、')}。
沖${ANIMALS[(db + 6) % 12]}，煞${['東', '南', '西', '北'][skyRow.sha]}。

對象：生肖${ANIMALS[zodiac]}。今天的關係：${RELATIONS[relIdx]}。${antiRepeat}`;
}

function buildZodiacPromptEn(zodiac, skyRow, yesterday) {
  const db = skyRow.day_branch;
  const ds = skyRow.day_stem;
  const dayGz = `${STEMS[ds]}${BRANCHES[db]}`;
  const dayEl = ELEMENTS_EN[STEM_EL[ds]];
  const diff = (db - zodiac + 12) % 12;
  const relIdx = diff === 6 ? 6 : diff === 0 ? 2 : diff === 4 || diff === 8 ? 1 : 3;
  const antiRepeat = yesterday ? `\nYesterday's headline was "${yesterday}" — use a different angle.` : '';
  return `You are the Chinese zodiac fortune writer for "吉光" (Daily Astro). Write in English, warm and practical — never alarmist.

Today: ${dayGz} day, ${dayEl} energy, ${JIANCHU[skyRow.jianchu]} day in the Jianchu system.
Auspicious: ${skyRow.yi.slice(0, 3).join(', ')}. Inauspicious: ${skyRow.ji.slice(0, 3).join(', ')}.
Clash: ${ANIMALS_EN[(db + 6) % 12]}. Direction to avoid: ${['East', 'South', 'West', 'North'][skyRow.sha]}.

Subject: ${ANIMALS_EN[zodiac]}. Today's relationship: ${RELATIONS_EN[relIdx]}.${antiRepeat}`;
}

function buildPrompt(key, skyRow, yesterday) {
  if (key.kind === 'astro') {
    return key.lang === 'zh'
      ? buildAstroPrompt(key.sun, key.rising, skyRow, yesterday)
      : buildAstroPromptEn(key.sun, key.rising, skyRow, yesterday);
  }
  return key.lang === 'zh'
    ? buildZodiacPrompt(key.zodiac, skyRow, yesterday)
    : buildZodiacPromptEn(key.zodiac, skyRow, yesterday);
}

async function getTargetDate(req) {
  try {
    const body = await req.clone().json();
    if (body?.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) return body.date;
  } catch { /* no body or not JSON */ }
  try {
    const url = new URL(req.url, 'http://localhost');
    const d = url.searchParams.get('date');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  } catch { /* no query string */ }
  return dateIn(new Date(Date.now() + 5 * 60e3), 'Asia/Taipei');
}

export default async (req) => {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!url || !key) return new Response('missing SUPABASE config', { status: 500 });
  if (!apiKey) return new Response('missing ANTHROPIC_API_KEY', { status: 500 });

  const date = await getTargetDate(req);
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // Idempotent: skip if a batch was already submitted for this date
  const { data: existing } = await supabase.from('reading_batches').select('batch_id, status').eq('date', date).maybeSingle();
  if (existing?.status === 'collected') {
    console.log(`daily-readings: already collected for ${date}, skipping`);
    return new Response(JSON.stringify({ date, status: 'already_collected' }), { headers: { 'content-type': 'application/json' } });
  }
  if (existing?.status === 'pending') {
    console.log(`daily-readings: batch already pending for ${date} (${existing.batch_id})`);
    return new Response(JSON.stringify({ date, status: 'already_pending', batch_id: existing.batch_id }), { headers: { 'content-type': 'application/json' } });
  }

  const skyRow = dailySky(date, 'Asia/Taipei');
  const anthropic = new Anthropic({ apiKey });

  // Fetch yesterday's headlines for anti-repeat
  const yesterday = new Date(new Date(date).getTime() - 86400e3).toISOString().slice(0, 10);
  const { data: prevRows } = await supabase.from('daily_readings').select('lang, kind, sun, rising, zodiac, headline').eq('date', yesterday);
  const prevMap = {};
  for (const r of (prevRows || [])) {
    const k = r.kind === 'astro' ? `${r.lang}:a:${r.sun}:${r.rising}` : `${r.lang}:z:${r.zodiac}`;
    prevMap[k] = r.headline;
  }

  // Build batch requests (336 = (12×13 astro + 12 zodiac) × 2 langs)
  const keys = allKeys();
  const requests = keys.map(k => ({
    custom_id: keyId(k),
    params: {
      model: 'claude-haiku-5-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: buildPrompt(k, skyRow, prevMap[keyId(k)]) }],
      tools: [READING_TOOL],
      tool_choice: { type: 'tool', name: 'reading' },
    },
  }));

  const batch = await anthropic.messages.batches.create({ requests });
  console.log(`daily-readings: batch submitted`, JSON.stringify({ date, batch_id: batch.id, items: requests.length }));

  // Store batch reference
  const { error } = await supabase.from('reading_batches').upsert(
    { date, batch_id: batch.id, status: 'pending', items: requests.length },
    { onConflict: 'date' },
  );
  if (error) console.error('daily-readings: failed to store batch ref', error.message);

  return new Response(JSON.stringify({ date, batch_id: batch.id, items: requests.length }), { headers: { 'content-type': 'application/json' } });
};

export const config = { schedule: '5 16 * * *' };
