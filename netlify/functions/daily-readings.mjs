// Scheduled Function: generate 144 星座 + 12 生肖 daily readings × 2 languages using Claude Haiku.
// Runs at 00:05 Asia/Taipei (16:05 UTC), after daily-sky writes the sky row.
// Uses ANTHROPIC_API_KEY and SUPABASE_SECRET_KEY.
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { dailySky, dateIn, almanac } from '../../src/astro/index.js';

const SIGNS = ['牡羊', '金牛', '雙子', '巨蟹', '獅子', '處女', '天秤', '天蠍', '射手', '魔羯', '水瓶', '雙魚'];
const SIGNS_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const ANIMALS = '鼠牛虎兔龍蛇馬羊猴雞狗豬';
const ANIMALS_EN = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
const ELEMENTS = ['木', '火', '土', '金', '水'];
const ELEMENTS_EN = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
const HOUSES = ['自我與形象', '金錢與價值', '溝通與學習', '家庭與安全感', '創作與戀愛', '工作與健康', '伴侶與合作', '深度與共享資源', '遠方與信念', '事業與名聲', '朋友與社群', '休息與內在'];
const HOUSES_EN = ['Self & Image', 'Money & Values', 'Communication', 'Home & Family', 'Creativity & Romance', 'Work & Health', 'Partnership', 'Shared Resources', 'Travel & Beliefs', 'Career & Status', 'Friends & Community', 'Rest & Inner Life'];
const ASPECTS = ['合相', '半六合', '六合', '四分相', '三分相', '梅花相', '對分相'];
const ASPECTS_EN = ['conjunction', 'semi-sextile', 'sextile', 'square', 'trine', 'quincunx', 'opposition'];
const RELATIONS = ['六合', '三合', '比和', '平', '害', '刑', '沖'];
const RELATIONS_EN = ['Harmony', 'Triple Harmony', 'Same Element', 'Neutral', 'Harm', 'Punishment', 'Clash'];
const JIANCHU = ['建', '除', '滿', '平', '定', '執', '破', '危', '成', '收', '開', '閉'];
const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];

function templateAstroReading(sun, rising, skyRow) {
  const base = rising >= 0 ? rising : sun;
  const house = (skyRow.moon_sign - base + 12) % 12;
  const sep = (skyRow.moon_sign - sun + 12) % 12;
  const aspect = Math.min(sep, 12 - sep);
  const good = [0, 2, 4].includes(aspect);
  const score = good ? 4 : aspect === 3 || aspect === 6 ? 2 : 3;
  return {
    headline: `月亮行經第${house + 1}宮（${HOUSES[house]}），${good ? '順利前行' : '留心調整'}`,
    body: `今天月亮在${SIGNS[skyRow.moon_sign]}座，落入你的第${house + 1}宮，主題是${HOUSES[house]}。月亮與太陽成${ASPECTS[aspect]}，${good ? '心情和目標同步，適合主動出擊。' : '情緒可能有些拉扯，重要決定緩一緩。'}`,
    scores: [score, Math.max(1, score + (good ? 0 : -1)), score, Math.max(1, score - 1)],
    what_changed: `月亮從${SIGNS[(skyRow.moon_sign + 11) % 12]}座移入${SIGNS[skyRow.moon_sign]}座，焦點轉向${HOUSES[house]}。`,
  };
}

function templateAstroReadingEn(sun, rising, skyRow) {
  const base = rising >= 0 ? rising : sun;
  const house = (skyRow.moon_sign - base + 12) % 12;
  const sep = (skyRow.moon_sign - sun + 12) % 12;
  const aspect = Math.min(sep, 12 - sep);
  const good = [0, 2, 4].includes(aspect);
  const score = good ? 4 : aspect === 3 || aspect === 6 ? 2 : 3;
  return {
    headline: `Moon in the ${ordinal(house + 1)} house (${HOUSES_EN[house]}): ${good ? 'smooth sailing' : 'take it easy'}`,
    body: `Today the Moon is in ${SIGNS_EN[skyRow.moon_sign]}, entering your ${ordinal(house + 1)} house of ${HOUSES_EN[house]}. The Moon forms a ${ASPECTS_EN[aspect]} with the Sun — ${good ? 'your emotions and goals are aligned; a good time to take initiative.' : 'you may feel some inner tension; hold off on major decisions.'}`,
    scores: [score, Math.max(1, score + (good ? 0 : -1)), score, Math.max(1, score - 1)],
    what_changed: `Moon moved from ${SIGNS_EN[(skyRow.moon_sign + 11) % 12]} into ${SIGNS_EN[skyRow.moon_sign]}, shifting focus to ${HOUSES_EN[house]}.`,
  };
}

function templateZodiacReading(zodiac, skyRow) {
  const db = skyRow.day_branch;
  const diff = (db - zodiac + 12) % 12;
  const relIdx = diff === 6 ? 6 : diff === 0 ? 2 : diff === 4 || diff === 8 ? 1 : 3;
  const good = relIdx <= 2;
  const score = good ? 4 : relIdx >= 5 ? 2 : 3;
  const dayEl = ELEMENTS[STEM_EL[skyRow.day_stem]];
  return {
    headline: `${ANIMALS[zodiac]}・${RELATIONS[relIdx]}日：${good ? '順勢而為' : '穩穩前進'}`,
    body: `今天${STEMS[skyRow.day_stem]}${BRANCHES[db]}日，${dayEl}氣當值，你的生肖${ANIMALS[zodiac]}今日是${RELATIONS[relIdx]}。${good ? '人緣和運勢都站在你這邊，適合主動推進。' : '步調放慢一點，重要的事不急在今天。'}宜${skyRow.yi.slice(0, 3).join('、')}。`,
    scores: [score, score, Math.max(1, score - 1), score],
    what_changed: `日柱換為${STEMS[skyRow.day_stem]}${BRANCHES[db]}，${dayEl}氣${good ? '助力' : '稍弱'}。`,
  };
}

function templateZodiacReadingEn(zodiac, skyRow) {
  const db = skyRow.day_branch;
  const diff = (db - zodiac + 12) % 12;
  const relIdx = diff === 6 ? 6 : diff === 0 ? 2 : diff === 4 || diff === 8 ? 1 : 3;
  const good = relIdx <= 2;
  const score = good ? 4 : relIdx >= 5 ? 2 : 3;
  const dayEl = ELEMENTS_EN[STEM_EL[skyRow.day_stem]];
  return {
    headline: `${ANIMALS_EN[zodiac]} · ${RELATIONS_EN[relIdx]} day: ${good ? 'go with the flow' : 'steady ahead'}`,
    body: `Today is a ${dayEl} day (${STEMS[skyRow.day_stem]}${BRANCHES[db]}). Your sign, ${ANIMALS_EN[zodiac]}, is in ${RELATIONS_EN[relIdx]} with the day. ${good ? 'People and luck are on your side — a good time to move forward.' : 'Take it slow; no rush on anything important today.'}`,
    scores: [score, score, Math.max(1, score - 1), score],
    what_changed: `Day pillar changed to ${STEMS[skyRow.day_stem]}${BRANCHES[db]}; ${dayEl} energy ${good ? 'supports you' : 'is mild'}.`,
  };
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

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
月亮落入第${house + 1}宮（${HOUSES[house]}），與太陽成${ASPECTS[aspect]}。${antiRepeat}

請回覆 JSON（不加 markdown 標記）：
{"headline":"10–16字標題","body":"50–80字正文，具體建議","scores":[整體,愛情,事業,財運],"what_changed":"一句話說明今天和昨天最大的不同"}
scores 每項 1–5。`;
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
Moon in the ${ordinal(house + 1)} house (${HOUSES_EN[house]}), ${ASPECTS_EN[aspect]} to the Sun.${antiRepeat}

Reply with JSON only (no markdown):
{"headline":"10–16 word headline","body":"50–80 word reading with specific advice","scores":[overall,love,career,finance],"what_changed":"One sentence on the biggest change from yesterday"}
Each score 1–5.`;
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

對象：生肖${ANIMALS[zodiac]}。今天的關係：${RELATIONS[relIdx]}。${antiRepeat}

請回覆 JSON（不加 markdown 標記）：
{"headline":"10–16字標題","body":"50–80字正文，具體建議","scores":[整體,愛情,事業,財運],"what_changed":"一句話說明今天和昨天最大的不同"}
scores 每項 1–5。`;
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

Subject: ${ANIMALS_EN[zodiac]}. Today's relationship: ${RELATIONS_EN[relIdx]}.${antiRepeat}

Reply with JSON only (no markdown):
{"headline":"10–16 word headline","body":"50–80 word reading with specific advice","scores":[overall,love,career,finance],"what_changed":"One sentence on the biggest change from yesterday"}
Each score 1–5.`;
}

function parseReading(text) {
  const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const obj = JSON.parse(clean);
  if (!obj.headline || !obj.body || !Array.isArray(obj.scores) || obj.scores.length !== 4) throw new Error('invalid shape');
  obj.scores = obj.scores.map(s => Math.max(1, Math.min(5, Math.round(s))));
  return obj;
}

async function generateReadings(anthropic, lang, date, skyRow, prevMap) {
  const rows = [];
  let totalInput = 0, totalOutput = 0, aiCount = 0, templateCount = 0;
  const isZh = lang === 'zh';

  for (let sun = 0; sun < 12; sun++) {
    for (let rising = -1; rising < 12; rising++) {
      const prev = prevMap[`${lang}:a:${sun}:${rising}`];
      let reading;
      try {
        const prompt = isZh
          ? buildAstroPrompt(sun, rising, skyRow, prev)
          : buildAstroPromptEn(sun, rising, skyRow, prev);
        const resp = await anthropic.messages.create({
          model: 'claude-haiku-5-5',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        });
        totalInput += resp.usage.input_tokens;
        totalOutput += resp.usage.output_tokens;
        reading = parseReading(resp.content[0].text);
        aiCount++;
      } catch (e) {
        console.warn(`daily-readings: AI failed for ${lang} astro sun=${sun} rising=${rising}: ${e.message}`);
        reading = isZh ? templateAstroReading(sun, rising, skyRow) : templateAstroReadingEn(sun, rising, skyRow);
        templateCount++;
      }
      rows.push({ date, kind: 'astro', lang, sun, rising, zodiac: -1, ...reading });
    }
  }

  for (let zodiac = 0; zodiac < 12; zodiac++) {
    const prev = prevMap[`${lang}:z:${zodiac}`];
    let reading;
    try {
      const prompt = isZh
        ? buildZodiacPrompt(zodiac, skyRow, prev)
        : buildZodiacPromptEn(zodiac, skyRow, prev);
      const resp = await anthropic.messages.create({
        model: 'claude-haiku-5-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });
      totalInput += resp.usage.input_tokens;
      totalOutput += resp.usage.output_tokens;
      reading = parseReading(resp.content[0].text);
      aiCount++;
    } catch (e) {
      console.warn(`daily-readings: AI failed for ${lang} zodiac=${zodiac}: ${e.message}`);
      reading = isZh ? templateZodiacReading(zodiac, skyRow) : templateZodiacReadingEn(zodiac, skyRow);
      templateCount++;
    }
    rows.push({ date, kind: 'zodiac', lang, sun: -1, rising: -1, zodiac, ...reading });
  }

  return { rows, totalInput, totalOutput, aiCount, templateCount };
}

export default async () => {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!url || !key) return new Response('missing SUPABASE config', { status: 500 });
  if (!apiKey) return new Response('missing ANTHROPIC_API_KEY', { status: 500 });

  const date = dateIn(new Date(Date.now() + 5 * 60e3), 'Asia/Taipei');
  const skyRow = dailySky(date, 'Asia/Taipei');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const anthropic = new Anthropic({ apiKey });

  // Fetch yesterday's headlines for anti-repeat
  const yesterday = new Date(new Date(date).getTime() - 86400e3).toISOString().slice(0, 10);
  const { data: prevRows } = await supabase.from('daily_readings').select('lang, kind, sun, rising, zodiac, headline').eq('date', yesterday);
  const prevMap = {};
  for (const r of (prevRows || [])) {
    const k = r.kind === 'astro' ? `${r.lang}:a:${r.sun}:${r.rising}` : `${r.lang}:z:${r.zodiac}`;
    prevMap[k] = r.headline;
  }

  // Generate zh and en in sequence (312 rows total)
  let allRows = [], totalInput = 0, totalOutput = 0, aiCount = 0, templateCount = 0;
  for (const lang of ['zh', 'en']) {
    const result = await generateReadings(anthropic, lang, date, skyRow, prevMap);
    allRows = allRows.concat(result.rows);
    totalInput += result.totalInput;
    totalOutput += result.totalOutput;
    aiCount += result.aiCount;
    templateCount += result.templateCount;
  }

  // Upsert all rows (312 = 156 × 2 langs)
  const { error } = await supabase.from('daily_readings').upsert(allRows, { onConflict: 'date,kind,lang,sun,rising,zodiac' });
  if (error) {
    console.error('daily-readings: upsert failed', error);
    return new Response(error.message, { status: 500 });
  }

  const costInput = totalInput * 0.10 / 1e6;
  const costOutput = totalOutput * 0.50 / 1e6;
  const summary = { date, rows: allRows.length, ai: aiCount, template: templateCount, input_tokens: totalInput, output_tokens: totalOutput, cost_usd: +(costInput + costOutput).toFixed(4) };
  console.log('daily-readings', JSON.stringify(summary));
  return new Response(JSON.stringify(summary), { headers: { 'content-type': 'application/json' } });
};

export const config = { schedule: '5 16 * * *' };
