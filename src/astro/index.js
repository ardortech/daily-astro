// Chart + daily reading logic. Positions come from astronomy-engine (./math.js);
// birth times are converted to UTC with the city's IANA zone (./tz.js).
// Returns indices only; all wording lives in src/i18n.
import { Search, MakeTime } from 'astronomy-engine';
import { julianDay, sunLon, moonLon, ascendant, signOf, norm } from './math.js';
import { CITIES, REGIONS, cityById } from './cities.js';
import { zonedToUtc, dateIn } from './tz.js';

export { CITIES, REGIONS, cityById, zonedToUtc, dateIn };
export const GLYPH = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
// Element of a sign index is ELEMENT[sign % 4]: 0 fire, 1 earth, 2 air, 3 water.
export const elementOf = sign => sign % 4;
// Lucky colour hex per element; names are i18n luckyColors[element][i].
export const COLOR_HEX = [
  ['#e0654e', '#e3953a', '#c8322b'],
  ['#7a8a3e', '#7b5539', '#d7c6a3'],
  ['#7fb0dc', '#a99bd6', '#b8bcc6'],
  ['#22406e', '#3f9a96', '#efece4']];
export const ITEM_COUNT = 4;
// Aspect index = sign distance 0..6 (合相 … 對分相); tense ones flip the push copy.
export const TENSE_ASPECTS = [3, 6];

const ymd = s => s.split('-').map(Number);
const moonSignAt = date => signOf(moonLon(julianDay(date)));

// Start and end (exclusive) of calendar day dateStr in tz, as UTC Dates.
// DST days are 23 or 25 hours long.
export function dayBounds(dateStr, tz) {
  const [y, m, d] = ymd(dateStr);
  return [zonedToUtc(y, m, d, 0, 0, tz), zonedToUtc(y, m, d + 1, 0, 0, tz)];
}

// { sun, moon, rising, sunUncertain, moonUncertain }. Without a birth time the chart
// uses local noon, rising is null, and sun/moonUncertain is true if that body changes
// sign at any point during that local day (so the noon sign may be wrong).
export function chartFor(dateStr, timeStr, cityId, noTime) {
  const c = cityById(cityId);
  const [y, m, d] = ymd(dateStr);
  const [hh, mm] = noTime ? [12, 0] : timeStr.split(':').map(Number);
  const jd = julianDay(zonedToUtc(y, m, d, hh, mm, c.tz));
  let sunUncertain = false, moonUncertain = false;
  if (noTime) {
    const [start, end] = dayBounds(dateStr, c.tz).map(julianDay);
    const last = end - 0.001 / 86400; // 1 ms before the next local midnight
    sunUncertain = signOf(sunLon(start)) !== signOf(sunLon(last));
    moonUncertain = signOf(moonLon(start)) !== signOf(moonLon(last));
  }
  return { sun: signOf(sunLon(jd)), moon: signOf(moonLon(jd)), rising: noTime ? null : signOf(ascendant(jd, c.lat, c.lon)), sunUncertain, moonUncertain };
}

// First instant in [start, end) when the Moon enters a new sign, or null.
// The Moon moves ~13°/day, so a day holds at most one ingress.
export function moonIngress(start, end) {
  const s = moonLon(julianDay(start));
  if (signOf(s) === moonSignAt(end)) return null;
  const target = (signOf(s) + 1) * 30;
  // Search wants a function that rises through zero at the ingress.
  const f = time => ((moonLon(julianDay(time.date)) - target + 540) % 360) - 180;
  const hit = Search(f, MakeTime(start), MakeTime(end), { dt_tolerance_seconds: 1 });
  return hit ? hit.date : null;
}

// Rounded to the numeric(8,4) columns, kept below 360.
const deg4 = x => +x.toFixed(4) % 360;

// One row for the daily_sky table: the sky at 00:00 of dateStr in tz.
// phase is the Moon–Sun elongation in degrees (0 new, 180 full; see phaseIndex).
export function dailySky(dateStr, tz = 'Asia/Taipei') {
  const [start, end] = dayBounds(dateStr, tz);
  const s = sky(start);
  const change = moonIngress(start, end);
  return { date: dateStr, moon_sign: s.moon, moon_lon: deg4(s.mLon), phase: deg4(s.phase), moon_sign_change_at: change && change.toISOString() };
}

export function hash(s) { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

export function sky(now = new Date()) {
  const jd = julianDay(now);
  const mLon = moonLon(jd), sLon = sunLon(jd);
  return { now, jd, mLon, sLon, moon: signOf(mLon), phase: norm(mLon - sLon) };
}

// 0 新月 … 7 殘月
export function phaseIndex(p) {
  return p < 22.5 || p >= 337.5 ? 0 : p < 67.5 ? 1 : p < 112.5 ? 2 : p < 157.5 ? 3 : p < 202.5 ? 4 : p < 247.5 ? 5 : p < 292.5 ? 6 : 7;
}

export function reading(p, t) {
  const base = p.rising ?? p.sun;
  const house = (t.moon - base + 12) % 12;
  const sep = (t.moon - p.sun + 12) % 12;
  const aspect = Math.min(sep, 12 - sep);
  const el = elementOf(t.moon);
  const dayKey = t.now.toISOString().slice(0, 10) + base + p.sun;
  const h = hash(dayKey);
  const color = h % 3;
  // Unsigned shifts: the prototype's signed `>>` went negative for h ≥ 2^31
  // and produced an undefined lucky item.
  const item = (h >>> 3) % ITEM_COUNT;
  const good = [4, 2, 0].includes(aspect);
  const sc = k => Math.max(1, Math.min(5, 3 + (good ? 1 : -1) * ((h >>> k) & 1) + ((h >>> (k + 4)) % 2) - (aspect === 3 ? 1 : 0)));
  return { house, aspect, el, color, colorHex: COLOR_HEX[el][color], itemEl: elementOf(base), item, base,
    // overall, love, career, money — 1..5 stars
    scores: [sc(1), sc(5), sc(9), sc(13)] };
}
