// Build the push notification payload for a user.
// Uses AI readings when available, falls back to template.
import { dailySky, reading, zodiacReading, almanac, elementOf, hash } from '../../../src/astro/index.js';

const SIGNS_ZH = ['牡羊', '金牛', '雙子', '巨蟹', '獅子', '處女', '天秤', '天蠍', '射手', '魔羯', '水瓶', '雙魚'];
const SIGNS_EN = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const ANIMALS_ZH = '鼠牛虎兔龍蛇馬羊猴雞狗豬';
const ANIMALS_EN = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
const ELEMENTS_ZH = ['木', '火', '土', '金', '水'];
const RELATIONS_ZH = ['六合日', '三合日', '比和日', '平穩日', '相害日', '相刑日', '沖日'];
const RELATIONS_EN = ['Harmony day', 'Triple Harmony', 'Same Element', 'Neutral', 'Harm day', 'Punishment day', 'Clash day'];
const HOUSES_ZH = ['自我與形象', '金錢與價值', '溝通與學習', '家庭與安全感', '創作與戀愛', '工作與健康', '伴侶與合作', '深度與共享資源', '遠方與信念', '事業與名聲', '朋友與社群', '休息與內在'];
const LUCKY_COLORS_ZH = [
  ['珊瑚紅', '琥珀橘', '正紅'],
  ['橄欖綠', '可可棕', '燕麥米'],
  ['天空藍', '薰衣草紫', '銀灰'],
  ['海軍藍', '湖水綠', '珍珠白'],
];
const LUCKY_COLORS_EN = [
  ['Coral', 'Amber', 'Red'],
  ['Olive', 'Cocoa', 'Oatmeal'],
  ['Sky Blue', 'Lavender', 'Silver'],
  ['Navy', 'Teal', 'Pearl White'],
];
const WUXING_COLORS_ZH = ['竹青綠', '朱砂紅', '大地黃', '月白', '墨藍'];

export function buildPushPayload(user, localDate, lang, readingMap, skyRow) {
  const isZh = lang === 'zh';
  const signs = isZh ? SIGNS_ZH : SIGNS_EN;
  const animals = isZh ? ANIMALS_ZH : ANIMALS_EN;

  const sun = user.sun;
  const rising = user.rising ?? -1;
  const zodiac = user.zodiac ?? 0;
  const animalChar = isZh ? ANIMALS_ZH[zodiac] : ANIMALS_EN[zodiac];
  const elZodiac = isZh ? ELEMENTS_ZH[ELEMENTS_ZH.length > zodiac ? Math.floor(zodiac / 2) % 5 : 0] : '';

  let headline = '';
  let bodyParts = [];

  // Try AI reading for astro
  if (user.daily_enabled) {
    const astroKey = `${lang}_astro_${sun}_${rising}_${-1}`;
    const r = readingMap?.get(astroKey);
    if (r?.headline) {
      headline = r.headline;
    } else {
      headline = templateHeadline(user, localDate, isZh, skyRow);
    }
    const color = templateColor(user, localDate, isZh, skyRow);
    if (color) bodyParts.push(color);
  }

  // Try AI reading for zodiac
  if (user.zodiac_daily_enabled) {
    const zodiacKey = `${lang}_zodiac_${-1}_${-1}_${zodiac}`;
    const r = readingMap?.get(zodiacKey);
    if (r?.headline) {
      if (!headline) headline = r.headline;
      const rel = zodiacRelation(zodiac, localDate, isZh, skyRow);
      const elAnimal = isZh
        ? `${ELEMENTS_ZH[user.wuxing?.luckyElement ?? 0]}${ANIMALS_ZH[zodiac]}`
        : `${ANIMALS_EN[zodiac]}`;
      bodyParts.push(`${elAnimal}・${rel}`);
    } else {
      const rel = zodiacRelation(zodiac, localDate, isZh, skyRow);
      const elAnimal = isZh
        ? `${ELEMENTS_ZH[user.wuxing?.luckyElement ?? 0]}${ANIMALS_ZH[zodiac]}`
        : `${ANIMALS_EN[zodiac]}`;
      bodyParts.push(`${elAnimal}・${rel}`);
    }
  }

  if (!headline) headline = isZh ? `${signs[sun]}座今日運勢` : `${signs[sun]} Daily`;

  const title = isZh ? `早安！${headline}` : `Good morning! ${headline}`;
  const body = bodyParts.join(' ').slice(0, 110);

  return {
    title,
    body,
    tag: `daily-${localDate}`,
    url: '/?from=push',
    lang,
  };
}

function templateHeadline(user, localDate, isZh, skyRow) {
  if (!skyRow) {
    try { skyRow = dailySky(localDate); } catch { return isZh ? '今日運勢' : 'Today\'s forecast'; }
  }
  const base = user.rising ?? user.sun;
  const house = (skyRow.moon_sign - base + 12) % 12;
  return isZh ? HOUSES_ZH[house] : `Moon in ${HOUSES_ZH[house]}`;
}

function templateColor(user, localDate, isZh, skyRow) {
  if (!skyRow) {
    try { skyRow = dailySky(localDate); } catch { return ''; }
  }
  const el = elementOf(skyRow.moon_sign);
  const dayKey = localDate + (user.rising ?? user.sun) + user.sun;
  const h = hash(dayKey);
  const colorIdx = h % 3;
  const colors = isZh ? LUCKY_COLORS_ZH : LUCKY_COLORS_EN;
  const colorName = colors[el][colorIdx];
  const lucky = user.wuxing?.luckyElement;
  const luckyColor = lucky != null ? (isZh ? WUXING_COLORS_ZH[lucky] : '') : '';
  const prefix = isZh ? '幸運色' : 'Lucky color';
  let line = `${prefix} ${colorName}`;
  if (luckyColor) line += `・${isZh ? '配件' : 'accessory'} ${luckyColor}`;
  return line;
}

function zodiacRelation(zodiac, localDate, isZh, skyRow) {
  if (!skyRow) {
    try { skyRow = dailySky(localDate); } catch { return isZh ? '平穩日' : 'Neutral'; }
  }
  const db = skyRow.day_branch;
  const diff = (db - zodiac + 12) % 12;
  const relIdx = diff === 6 ? 6 : diff === 0 ? 2 : diff === 4 || diff === 8 ? 1 : diff === 1 || diff === 11 ? 0 : diff === 3 || diff === 9 ? 4 : diff === 5 || diff === 7 ? 5 : 3;
  return isZh ? RELATIONS_ZH[relIdx] : RELATIONS_EN[relIdx];
}
