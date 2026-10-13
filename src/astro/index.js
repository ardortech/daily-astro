// Chart + daily reading logic ported from design/prototype.html.
// Returns indices only; all wording lives in src/i18n.
import { julianDay, sunLon, moonLon, ascendant, signOf, norm } from './math.js';
import { CITIES } from './cities.js';

export { CITIES };
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

export function chartFor(dateStr, timeStr, cityId, noTime) {
  const c = CITIES.find(x => x[0] === cityId) ?? CITIES[0];
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = noTime ? [12, 0] : timeStr.split(':').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, hh - c[3], mm));
  const jd = julianDay(utc);
  return { sun: signOf(sunLon(jd)), moon: signOf(moonLon(jd)), rising: noTime ? null : signOf(ascendant(jd, c[1], c[2])) };
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
