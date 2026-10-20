// Shared constants, templates, tool schema and parsers for daily-readings functions.
export { dailySky, dateIn } from '../../../src/astro/index.js';

export const SIGNS = ['牡羊', '金牛', '雙子', '巨蟹', '獅子', '處女', '天秤', '天蠍', '射手', '魔羯', '水瓶', '雙魚'];
export const SIGNS_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
export const ANIMALS = '鼠牛虎兔龍蛇馬羊猴雞狗豬';
export const ANIMALS_EN = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
export const ELEMENTS = ['木', '火', '土', '金', '水'];
export const ELEMENTS_EN = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
export const HOUSES = ['自我與形象', '金錢與價值', '溝通與學習', '家庭與安全感', '創作與戀愛', '工作與健康', '伴侶與合作', '深度與共享資源', '遠方與信念', '事業與名聲', '朋友與社群', '休息與內在'];
export const HOUSES_EN = ['Self & Image', 'Money & Values', 'Communication', 'Home & Family', 'Creativity & Romance', 'Work & Health', 'Partnership', 'Shared Resources', 'Travel & Beliefs', 'Career & Status', 'Friends & Community', 'Rest & Inner Life'];
export const ASPECTS = ['合相', '半六合', '六合', '四分相', '三分相', '梅花相', '對分相'];
export const ASPECTS_EN = ['conjunction', 'semi-sextile', 'sextile', 'square', 'trine', 'quincunx', 'opposition'];
export const RELATIONS = ['六合', '三合', '比和', '平', '害', '刑', '沖'];
export const RELATIONS_EN = ['Harmony', 'Triple Harmony', 'Same Element', 'Neutral', 'Harm', 'Punishment', 'Clash'];
export const JIANCHU = ['建', '除', '滿', '平', '定', '執', '破', '危', '成', '收', '開', '閉'];
export const STEMS = '甲乙丙丁戊己庚辛壬癸';
export const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
export const STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
export const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const READING_TOOL = {
  name: 'reading',
  description: 'Return the daily horoscope reading',
  input_schema: {
    type: 'object',
    properties: {
      headline: { type: 'string', description: '10–16 char headline' },
      body: { type: 'string', description: '50–80 char reading with specific advice' },
      watch_out: { type: 'string', description: 'One thing to watch out for today (one sentence)' },
      scores: {
        type: 'array',
        items: { type: 'integer', minimum: 1, maximum: 5 },
        minItems: 4, maxItems: 4,
        description: '[overall, love, career, finance] each 1–5',
      },
      what_changed: { type: 'string', description: 'One sentence on the biggest change from yesterday' },
    },
    required: ['headline', 'body', 'watch_out', 'scores', 'what_changed'],
  },
};

export function parseToolReading(content) {
  const toolBlock = content?.find(b => b.type === 'tool_use');
  if (toolBlock?.input) {
    const r = toolBlock.input;
    if (r.headline && r.body && Array.isArray(r.scores) && r.scores.length === 4) {
      r.scores = r.scores.map(s => Math.max(1, Math.min(5, Math.round(s))));
      return r;
    }
  }
  const textBlock = content?.find(b => b.type === 'text');
  if (textBlock?.text) {
    try {
      const clean = textBlock.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const obj = JSON.parse(clean);
      if (obj.headline && obj.body && Array.isArray(obj.scores) && obj.scores.length === 4) {
        obj.scores = obj.scores.map(s => Math.max(1, Math.min(5, Math.round(s))));
        return obj;
      }
    } catch { /* not valid JSON */ }
  }
  return null;
}

export function templateAstroReading(sun, rising, skyRow) {
  const base = rising >= 0 ? rising : sun;
  const house = (skyRow.moon_sign - base + 12) % 12;
  const sep = (skyRow.moon_sign - sun + 12) % 12;
  const aspect = Math.min(sep, 12 - sep);
  const good = [0, 2, 4].includes(aspect);
  const score = good ? 4 : aspect === 3 || aspect === 6 ? 2 : 3;
  return {
    headline: `月亮行經${HOUSES[house]}宮，${good ? '順利前行' : '留心調整'}`,
    body: `今天月亮在${SIGNS[skyRow.moon_sign]}座，落入你的${HOUSES[house]}宮。月亮與太陽成${ASPECTS[aspect]}，${good ? '心情和目標同步，適合主動出擊。' : '情緒可能有些拉扯，重要決定緩一緩。'}`,
    watch_out: good ? '今日無需特別留心。' : '情緒起伏較大，避免衝動決定。',
    scores: [score, Math.max(1, score + (good ? 0 : -1)), score, Math.max(1, score - 1)],
    what_changed: `月亮從${SIGNS[(skyRow.moon_sign + 11) % 12]}座移入${SIGNS[skyRow.moon_sign]}座，焦點轉向${HOUSES[house]}宮。`,
  };
}

export function templateAstroReadingEn(sun, rising, skyRow) {
  const base = rising >= 0 ? rising : sun;
  const house = (skyRow.moon_sign - base + 12) % 12;
  const sep = (skyRow.moon_sign - sun + 12) % 12;
  const aspect = Math.min(sep, 12 - sep);
  const good = [0, 2, 4].includes(aspect);
  const score = good ? 4 : aspect === 3 || aspect === 6 ? 2 : 3;
  return {
    headline: `Moon in the ${ordinal(house + 1)} house (${HOUSES_EN[house]}): ${good ? 'smooth sailing' : 'take it easy'}`,
    body: `Today the Moon is in ${SIGNS_EN[skyRow.moon_sign]}, entering your ${ordinal(house + 1)} house of ${HOUSES_EN[house]}. The Moon forms a ${ASPECTS_EN[aspect]} with the Sun — ${good ? 'your emotions and goals are aligned; a good time to take initiative.' : 'you may feel some inner tension; hold off on major decisions.'}`,
    watch_out: good ? 'Nothing special to watch out for today.' : 'Emotional ups and downs — avoid impulsive decisions.',
    scores: [score, Math.max(1, score + (good ? 0 : -1)), score, Math.max(1, score - 1)],
    what_changed: `Moon moved from ${SIGNS_EN[(skyRow.moon_sign + 11) % 12]} into ${SIGNS_EN[skyRow.moon_sign]}, shifting focus to ${HOUSES_EN[house]}.`,
  };
}

export function templateZodiacReading(zodiac, skyRow) {
  const db = skyRow.day_branch;
  const diff = (db - zodiac + 12) % 12;
  const relIdx = diff === 6 ? 6 : diff === 0 ? 2 : diff === 4 || diff === 8 ? 1 : 3;
  const good = relIdx <= 2;
  const score = good ? 4 : relIdx >= 5 ? 2 : 3;
  const dayEl = ELEMENTS[STEM_EL[skyRow.day_stem]];
  return {
    headline: `${ANIMALS[zodiac]}・${RELATIONS[relIdx]}日：${good ? '順勢而為' : '穩穩前進'}`,
    body: `今天${STEMS[skyRow.day_stem]}${BRANCHES[db]}日，${dayEl}氣當值，你的生肖${ANIMALS[zodiac]}今日是${RELATIONS[relIdx]}。${good ? '人緣和運勢都站在你這邊，適合主動推進。' : '步調放慢一點，重要的事不急在今天。'}宜${skyRow.yi.slice(0, 3).join('、')}。`,
    watch_out: good ? '好運不等於冒進，見好就收。' : '避免和人正面衝突。',
    scores: [score, score, Math.max(1, score - 1), score],
    what_changed: `日柱換為${STEMS[skyRow.day_stem]}${BRANCHES[db]}，${dayEl}氣${good ? '助力' : '稍弱'}。`,
  };
}

export function templateZodiacReadingEn(zodiac, skyRow) {
  const db = skyRow.day_branch;
  const diff = (db - zodiac + 12) % 12;
  const relIdx = diff === 6 ? 6 : diff === 0 ? 2 : diff === 4 || diff === 8 ? 1 : 3;
  const good = relIdx <= 2;
  const score = good ? 4 : relIdx >= 5 ? 2 : 3;
  const dayEl = ELEMENTS_EN[STEM_EL[skyRow.day_stem]];
  return {
    headline: `${ANIMALS_EN[zodiac]} · ${RELATIONS_EN[relIdx]} day: ${good ? 'go with the flow' : 'steady ahead'}`,
    body: `Today is a ${dayEl} day (${STEMS[skyRow.day_stem]}${BRANCHES[db]}). Your sign, ${ANIMALS_EN[zodiac]}, is in ${RELATIONS_EN[relIdx]} with the day. ${good ? 'People and luck are on your side — a good time to move forward.' : 'Take it slow; no rush on anything important today.'}`,
    watch_out: good ? 'Good luck doesn\'t mean recklessness — know when to stop.' : 'Avoid head-on confrontations today.',
    scores: [score, score, Math.max(1, score - 1), score],
    what_changed: `Day pillar changed to ${STEMS[skyRow.day_stem]}${BRANCHES[db]}; ${dayEl} energy ${good ? 'supports you' : 'is mild'}.`,
  };
}

export function templateFor(key, skyRow) {
  if (key.kind === 'astro') {
    return key.lang === 'zh'
      ? templateAstroReading(key.sun, key.rising, skyRow)
      : templateAstroReadingEn(key.sun, key.rising, skyRow);
  }
  return key.lang === 'zh'
    ? templateZodiacReading(key.zodiac, skyRow)
    : templateZodiacReadingEn(key.zodiac, skyRow);
}

export function allKeys() {
  const keys = [];
  for (const lang of ['zh', 'en']) {
    for (let sun = 0; sun < 12; sun++) {
      for (let rising = -1; rising < 12; rising++) {
        keys.push({ kind: 'astro', lang, sun, rising, zodiac: -1 });
      }
    }
    for (let zodiac = 0; zodiac < 12; zodiac++) {
      keys.push({ kind: 'zodiac', lang, sun: -1, rising: -1, zodiac });
    }
  }
  return keys;
}

// custom_id for the Batches API: must match ^[a-zA-Z0-9_-]{1,64}$
// Astro:  zh_astro_s7_r4  (rising -1 → rx)
// Zodiac: en_zodiac_z5
export function keyId(k) {
  if (k.kind === 'astro') {
    const r = k.rising < 0 ? 'rx' : `r${k.rising}`;
    return `${k.lang}_astro_s${k.sun}_${r}`;
  }
  return `${k.lang}_zodiac_z${k.zodiac}`;
}

export function parseKeyId(id) {
  const parts = id.split('_');
  const lang = parts[0];
  if (parts[1] === 'astro') {
    const sun = +parts[2].slice(1);
    const rising = parts[3] === 'rx' ? -1 : +parts[3].slice(1);
    return { kind: 'astro', lang, sun, rising, zodiac: -1 };
  }
  return { kind: 'zodiac', lang, sun: -1, rising: -1, zodiac: +parts[2].slice(1) };
}
