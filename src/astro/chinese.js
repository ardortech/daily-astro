// Chinese calendar: 農曆 conversion, 生肖, 八字 五行, today's almanac and the
// 生肖 relation of the day. Backed by lunar-javascript (MIT, 6tail).
// Returns indices only; all wording lives in src/i18n:
//   stem 0–9 (甲 … 癸), branch 0–11 (子 … 亥; also the 生肖 animal),
//   wuxing element 0–4 (木 火 土 金 水), lunar month 1–12 with a separate leap flag.
import { Solar, Lunar, LunarYear } from 'lunar-javascript';
import { cityById } from './cities.js';
import { zonedToUtc } from './tz.js';

// 五行 of each heavenly stem / each earthly branch's main qi (本氣).
export const STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
export const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
// The element that generates e (生我者): 水生木, 木生火, 火生土, 土生金, 金生水.
const GENERATED_BY = e => (e + 4) % 5;
// Swatch hex per element; names are i18n wuxingColors[element].
export const WUXING_HEX = ['#4f8a5b', '#b8432f', '#c49a3c', '#e8e6df', '#24365e'];

const ymd = s => s.split('-').map(Number);
const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// ---- 國曆 ⇄ 農曆 ----

// 'YYYY-MM-DD' → { year, month (1–12), day, leap }.
export function solarToLunar(dateStr) {
  const [y, m, d] = ymd(dateStr);
  const l = Solar.fromYmd(y, m, d).getLunar();
  return { year: l.getYear(), month: Math.abs(l.getMonth()), day: l.getDay(), leap: l.getMonth() < 0 };
}

// 農曆 → 'YYYY-MM-DD', or null if that date doesn't exist (no such 閏月, day 30 of a 29-day month).
export function lunarToSolar(year, month, day, leap = false) {
  try {
    const s = Lunar.fromYmd(year, leap ? -month : month, day).getSolar();
    return iso(s.getYear(), s.getMonth(), s.getDay());
  } catch {
    return null;
  }
}

// The months of lunar year `year` in order, e.g. 2025 has 閏六月 after 六月.
export function lunarMonths(year) {
  return LunarYear.fromYear(year).getMonths()
    .filter(m => m.getYear() === year)
    .map(m => ({ month: Math.abs(m.getMonth()), leap: m.getMonth() < 0, days: m.getDayCount() }));
}

// ---- 生肖 + 八字 ----

// The year and month pillars change at solar terms (生肖 at 立春), which lunar-javascript
// tabulates in China time, so the birth instant is converted to UTC+8 for those.
// The day and hour pillars follow the local clock where the person was born.
function chinaTime(y, m, d, hh, mm, tz) {
  const t = new Date(zonedToUtc(y, m, d, hh, mm, tz).getTime() + 8 * 3600e3);
  return Solar.fromYmdHms(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate(), t.getUTCHours(), t.getUTCMinutes(), 0);
}

// { zodiac, zodiacUncertain, wuxing: { pillars, counts, dayMaster, luckyElement } }.
// pillars: [[stem, branch] × 3 or 4] (year, month, day, hour; no hour without a birth time).
// counts: how many stems + branches (本氣) fall in each element 木 火 土 金 水.
// Without a birth time the chart uses local noon, and zodiacUncertain is set if 立春
// falls during that local day (the year, and so the 生肖, changes that day).
export function baziFor(dateStr, timeStr, cityId, noTime) {
  const { tz } = cityById(cityId);
  const [y, m, d] = ymd(dateStr);
  const [hh, mm] = noTime ? [12, 0] : timeStr.split(':').map(Number);

  const yearMonth = chinaTime(y, m, d, hh, mm, tz).getLunar();
  const local = Solar.fromYmdHms(y, m, d, hh, mm, 0).getLunar().getEightChar();
  const pillars = [
    [yearMonth.getYearGanIndexExact(), yearMonth.getYearZhiIndexExact()],
    [yearMonth.getMonthGanIndexExact(), yearMonth.getMonthZhiIndexExact()],
    [local.getDayGanIndex(), local.getDayZhiIndex()],
  ];
  if (!noTime) pillars.push([local.getLunar().getTimeGanIndex(), local.getLunar().getTimeZhiIndex()]);

  const zodiac = pillars[0][1];
  let zodiacUncertain = false;
  if (noTime) {
    const first = chinaTime(y, m, d, 0, 0, tz).getLunar().getYearZhiIndexExact();
    const last = chinaTime(y, m, d, 23, 59, tz).getLunar().getYearZhiIndexExact();
    zodiacUncertain = first !== last;
  }
  return { zodiac, zodiacUncertain, wuxing: wuxingOf(pillars) };
}

// Element counts, day master, and the element to strengthen (補運): the weakest
// element; on a tie, the one that generates the day master if it is among them.
export function wuxingOf(pillars) {
  const counts = [0, 0, 0, 0, 0];
  for (const [s, b] of pillars) { counts[STEM_EL[s]]++; counts[BRANCH_EL[b]]++; }
  const dayMaster = pillars[2][0];
  const min = Math.min(...counts);
  const weak = [0, 1, 2, 3, 4].filter(e => counts[e] === min);
  const helper = GENERATED_BY(STEM_EL[dayMaster]);
  return { pillars, counts, dayMaster, luckyElement: weak.includes(helper) ? helper : weak[0] };
}

// ---- Today ----

// 財神 direction per day stem (i18n directions: 正東 東南 正南 西南 正西 西北 正北 東北),
// 煞 direction per day branch (i18n shaDirections: 東 南 西 北).
const CAI = [7, 7, 3, 3, 6, 6, 0, 0, 2, 2];
const SHA = [1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3, 2];
const JIANCHU = '建除满平定执破危成收开闭';

// lunar-javascript returns Simplified Chinese; map to Traditional for zh-TW.
const SC2TC = { 开: '開', 动: '動', 纳: '納', 嫁娶: '嫁娶', 启: '啟', 钻: '鑽',
  进: '進', 补: '補', 修坟: '修墳', 修门: '修門', 安门: '安門', 开仓: '開倉',
  开光: '開光', 开厕: '開廁', 开市: '開市', 开柱眼: '開柱眼', 开池: '開池',
  开渠: '開渠', 开生坟: '開生墳', 归宁: '歸寧', 归岫: '歸岫', 扫舍: '掃舍',
  挂匾: '掛匾', 栽种: '栽種', 求医: '求醫', 谢土: '謝土', 造仓: '造倉',
  造庙: '造廟', 造桥: '造橋', 造车器: '造車器', 针灸: '針灸', 问名: '問名',
  订盟: '訂盟', 词讼: '詞訟', 诸事不宜: '諸事不宜', 馀事勿取: '餘事勿取',
  结网: '結網', 经络: '經絡', 盖屋: '蓋屋', 竖柱: '豎柱', 筑堤: '築堤',
  习艺: '習藝', 会亲友: '會親友', 入学: '入學', 入殓: '入殮',
  出货财: '出貨財', 取渔: '取漁', 合寿木: '合壽木', 合帐: '合帳',
  塑绘: '塑繪', 坏垣: '壞垣', 安机械: '安機械', 教牛马: '教牛馬',
  斋醮: '齋醮', 断蚁: '斷蟻', 架马: '架馬', 修饰垣墙: '修飾垣牆',
  牧养: '牧養', 畋猎: '畋獵', 置产: '置產', 行丧: '行喪',
  雇佣: '雇傭', 平治道涂: '平治道塗', 动土: '動土', 纳婿: '納婿',
  纳畜: '納畜', 纳财: '納財', 纳采: '納采', 补垣: '補垣',
  启钻: '啟鑽', 进人口: '進人口', 无: '無' };
const scToTc = s => SC2TC[s] || s;

// The almanac for a civil date: { lunar, year: [s, b], month: [s, b], day: [s, b],
// jianchu 0–11, yi, ji, chong (branch clashing with the day), sha, cai, goodHours [branch…] }.
export function almanac(dateStr) {
  const [y, m, d] = ymd(dateStr);
  const l = Solar.fromYmd(y, m, d).getLunar();
  const ds = l.getDayGanIndex(), db = l.getDayZhiIndex();
  return {
    lunar: { year: l.getYear(), month: Math.abs(l.getMonth()), day: l.getDay(), leap: l.getMonth() < 0 },
    year: [l.getYearGanIndexByLiChun(), l.getYearZhiIndexByLiChun()],
    month: [l.getMonthGanIndexExact(), l.getMonthZhiIndexExact()],
    day: [ds, db],
    jianchu: JIANCHU.indexOf(l.getZhiXing()),
    yi: l.getDayYi().map(scToTc),
    ji: l.getDayJi().map(scToTc),
    chong: (db + 6) % 12,
    sha: SHA[db],
    cai: CAI[ds],
    goodHours: goodHours(db),
  };
}

// 黃道 hours of a day with branch db (青龍 明堂 金匱 天德 玉堂 司命).
export function goodHours(db) {
  const start = [8, 10, 0, 2, 4, 6, 8, 10, 0, 2, 4, 6][db];
  return [...Array(12).keys()].filter(h => [0, 1, 4, 5, 7, 10].includes((h - start + 12) % 12));
}

// 時辰 branch of a clock hour: 子 23–01, 丑 01–03 …
export const hourBranch = h => Math.floor(((h + 1) % 24) / 2);

// Relation of today's day branch d to the person's year branch u.
// 0 六合 · 1 三合 · 2 比和 · 3 平 · 4 害 · 5 刑 · 6 沖 (i18n relations).
export const RELATION_TONE = ['good', 'good', 'mid', 'mid', 'bad', 'bad', 'bad'];
export const RELATION_SCORES = [[5, 4, 4, 4], [4, 4, 4, 3], [3, 3, 4, 3], [3, 3, 3, 3], [2, 2, 3, 3], [2, 2, 2, 3], [1, 2, 2, 2]];
const XING = [[0, 3], [3, 0], [2, 5], [5, 8], [8, 2], [1, 10], [10, 7], [7, 1]];
export function relation(d, u) {
  const diff = (d - u + 12) % 12;
  if (diff === 6) return 6;
  if ((d + u) % 12 === 1) return 0;
  if (diff === 4 || diff === 8) return 1;
  if ((d + u) % 12 === 7) return 4;
  if (XING.some(([a, b]) => a === d && b === u) || (d === u && [4, 6, 9, 11].includes(d))) return 5;
  if (d === u) return 2;
  return 3;
}

// Animals in 六合 or 三合 with the day: today's 貴人生肖.
export const luckyAnimals = db => [...Array(12).keys()].filter(u => relation(db, u) <= 1);

// 生肖 reading for a profile on a day: { rel, tone, scores, boost, taisui }.
// boost: the day stem's element is the person's 補運 element (+1 整體 star).
// taisui: 0 值太歲, 1 沖太歲, 2 害太歲, or null.
export function zodiacReading(p, a) {
  const rel = relation(a.day[1], p.zodiac);
  const boost = STEM_EL[a.day[0]] === p.wuxing.luckyElement;
  const yb = a.year[1];
  const taisui = p.zodiac === yb ? 0 : (p.zodiac + 6) % 12 === yb ? 1 : (p.zodiac + yb) % 12 === 7 ? 2 : null;
  const scores = RELATION_SCORES[rel].map((v, i) => Math.min(5, v + (boost && i === 0 ? 1 : 0)));
  return { rel, tone: RELATION_TONE[rel], scores, boost, taisui };
}
