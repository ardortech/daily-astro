// Scheduled Function: collect Message Batch results for daily readings.
// Runs at 00:35 Asia/Taipei (16:35 UTC), ~30 min after daily-readings submits.
// Parses tool_use responses, upserts AI rows, fills gaps with template fallbacks.
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import {
  dailySky, dateIn, parseToolReading, templateFor,
  allKeys, keyId, parseKeyId,
} from './_lib/readings.mjs';

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

  // Find batch for this date
  const { data: batchRow } = await supabase.from('reading_batches').select('batch_id, status').eq('date', date).maybeSingle();
  if (!batchRow) {
    console.log(`daily-readings-collect: no batch found for ${date}`);
    return new Response(JSON.stringify({ date, error: 'no_batch' }), { status: 404, headers: { 'content-type': 'application/json' } });
  }

  const anthropic = new Anthropic({ apiKey });
  const batch = await anthropic.messages.batches.retrieve(batchRow.batch_id);

  if (batch.processing_status !== 'ended') {
    console.log(`daily-readings-collect: batch ${batchRow.batch_id} still ${batch.processing_status}`, JSON.stringify(batch.request_counts));
    return new Response(JSON.stringify({ date, status: batch.processing_status, counts: batch.request_counts }), { headers: { 'content-type': 'application/json' } });
  }

  // Skip keys that already have AI rows (so re-collect replaces templates but not AI)
  const { data: existingRows } = await supabase
    .from('daily_readings').select('kind, lang, sun, rising, zodiac, source')
    .eq('date', date).eq('source', 'ai');
  const existingSet = new Set((existingRows || []).map(r => keyId(r)));

  const t0 = Date.now();
  const aiRows = [];
  let aiCount = 0, parseFailCount = 0, errorCount = 0, skipCount = 0;

  for await (const entry of await anthropic.messages.batches.results(batchRow.batch_id)) {
    const kid = entry.custom_id;

    if (existingSet.has(kid)) { skipCount++; continue; }

    if (entry.result.type !== 'succeeded') {
      errorCount++;
      const errMsg = entry.result.type === 'errored'
        ? entry.result.error?.message?.slice(0, 200) ?? 'unknown'
        : entry.result.type;
      console.error(`daily-readings-collect: batch item failed`, JSON.stringify({ custom_id: kid, type: entry.result.type, error: errMsg }));
      continue;
    }

    const msg = entry.result.message;
    const reading = parseToolReading(msg.content);
    if (!reading) {
      parseFailCount++;
      const raw = msg.content?.find(b => b.type === 'text')?.text ?? '';
      console.error(`daily-readings-collect: parse failed`, JSON.stringify({
        custom_id: kid, stop_reason: msg.stop_reason, raw: raw.slice(0, 200),
      }));
      continue;
    }

    const k = parseKeyId(kid);
    aiRows.push({
      date, kind: k.kind, lang: k.lang, sun: k.sun, rising: k.rising, zodiac: k.zodiac,
      headline: reading.headline, body: reading.body,
      watch_out: reading.watch_out || null,
      scores: reading.scores, what_changed: reading.what_changed,
      source: 'ai',
    });
    aiCount++;
  }

  // Upsert AI rows (replaces any template rows for the same keys)
  if (aiRows.length > 0) {
    const { error } = await supabase.from('daily_readings').upsert(aiRows, { onConflict: 'date,kind,lang,sun,rising,zodiac' });
    if (error) {
      console.error('daily-readings-collect: upsert failed', error.message);
      return new Response(JSON.stringify({ date, error: error.message }), { status: 500, headers: { 'content-type': 'application/json' } });
    }
  }

  // Fill gaps with template fallbacks (only keys with no row at all)
  const { data: afterRows } = await supabase
    .from('daily_readings').select('kind, lang, sun, rising, zodiac')
    .eq('date', date);
  const afterSet = new Set((afterRows || []).map(r => keyId(r)));
  const keys = allKeys();
  const missingKeys = keys.filter(k => !afterSet.has(keyId(k)));

  let fallbackCount = 0;
  if (missingKeys.length > 0) {
    const skyRow = dailySky(date, 'Asia/Taipei');
    const fallbackRows = missingKeys.map(k => {
      const reading = templateFor(k, skyRow);
      return {
        date, kind: k.kind, lang: k.lang, sun: k.sun, rising: k.rising, zodiac: k.zodiac,
        headline: reading.headline, body: reading.body,
        watch_out: reading.watch_out || null,
        scores: reading.scores, what_changed: reading.what_changed,
        source: 'template',
      };
    });
    const { error } = await supabase.from('daily_readings').upsert(fallbackRows, { onConflict: 'date,kind,lang,sun,rising,zodiac' });
    if (error) console.error('daily-readings-collect: fallback upsert failed', error.message);
    fallbackCount = fallbackRows.length;
  }

  // Mark batch as collected
  await supabase.from('reading_batches').update({ status: 'collected' }).eq('date', date);

  const total = aiCount + fallbackCount + skipCount + parseFailCount + errorCount;
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const summary = { date, ai: aiCount, fallback: fallbackCount, skipped: skipCount, parse_fail: parseFailCount, error: errorCount, total, elapsed_s: elapsed };
  console.log(`daily-readings done: ai=${aiCount} fallback=${fallbackCount} skipped=${skipCount} parseFail=${parseFailCount} error=${errorCount} total=${total} in ${elapsed}s`);
  return new Response(JSON.stringify(summary), { headers: { 'content-type': 'application/json' } });
};

export const config = { schedule: '35 16 * * *' };
