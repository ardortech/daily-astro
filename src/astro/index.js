// Chart + daily reading logic. Positions come from astronomy-engine (./math.js);
// birth times are converted to UTC with the city's IANA zone (./tz.js).
// Returns indices only; all wording lives in src/i18n.
import { Search, MakeTime } from '#astronomy-engine';
import { julianDay, sunLon, moonLon, ascendant, signOf, norm, planetLon, isRetrograde, moonIllumination } from './math.js';
export { signOf, julianDay, moonLon, sunLon };
import { CITIES, REGIONS, cityById } from './cities.js';
import { zonedToUtc, dateIn } from './tz.js';
import { solarToLunar, baziFor, almanac, hourBranch, zodiacReading, dayTenGod, STEM_EL, BRANCH_EL } from './chinese.js';

export { CITIES, REGIONS, cityById, zonedToUtc, dateIn };
export * from './chinese.js';
// U+FE0E (text presentation) keeps iOS from drawing them as purple emoji.
export const GLYPH = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'].map(g => g + '\uFE0E');
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

// Birth inputs { date, time, city, noTime, calendar } → the full profile: the chart
// (sun, moon, rising + uncertainty), the 農曆 birth date, 生肖 and 八字 五行.
export function profileFor(b) {
  return { ...b, ...chartFor(b.date, b.time, b.city, b.noTime), lunar: solarToLunar(b.date), ...baziFor(b.date, b.time, b.city, b.noTime) };
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
  const jd = julianDay(start);
  const s = sky(start);
  const change = moonIngress(start, end);

  // Planets: sign, degree within sign, retrograde
  const planets = {};
  for (const body of ['Mercury', 'Venus', 'Mars']) {
    const lon = planetLon(body, jd);
    planets[body.toLowerCase()] = { sign: signOf(lon), lon: deg4(lon), retro: isRetrograde(body, jd) };
  }

  // Moon phase: illuminated fraction + waxing/waning
  const illum = moonIllumination(jd);
  const waxing = s.phase < 180;

  // Moon void-of-course: from the last major aspect before ingress to the ingress.
  let voc_start = null, voc_end = null;
  if (change) {
    voc_end = change.toISOString();
    voc_start = findVocStart(start, change, jd);
  }

  // Almanac data (干支, 建除, 宜忌, 沖煞, 吉時, 財神)
  const alm = almanac(dateStr);

  return {
    date: dateStr,
    sun_sign: signOf(s.sLon), sun_lon: deg4(s.sLon),
    moon_sign: s.moon, moon_lon: deg4(s.mLon), phase: deg4(s.phase),
    moon_illum: +illum.toFixed(4), moon_waxing: waxing,
    moon_sign_change_at: change && change.toISOString(),
    mercury_sign: planets.mercury.sign, mercury_lon: planets.mercury.lon, mercury_retro: planets.mercury.retro,
    venus_sign: planets.venus.sign, venus_lon: planets.venus.lon, venus_retro: planets.venus.retro,
    mars_sign: planets.mars.sign, mars_lon: planets.mars.lon, mars_retro: planets.mars.retro,
    voc_start, voc_end,
    day_stem: alm.day[0], day_branch: alm.day[1],
    jianchu: alm.jianchu,
    yi: alm.yi, ji: alm.ji,
    chong: alm.chong, sha: alm.sha, cai: alm.cai,
    good_hours: alm.goodHours,
  };
}

// Find the start of the Moon's void-of-course period before an ingress.
// Scans backward from the ingress for the last exact major aspect (0/60/90/120/180)
// between the Moon and any of the 5 visible bodies.
function findVocStart(dayStart, ingress, jdStart) {
  const ASPECTS = [0, 60, 90, 120, 180];
  const BODIES = ['Mercury', 'Venus', 'Mars'];
  const ingressJd = julianDay(ingress);
  let latestAspect = null;

  for (const body of BODIES) {
    const pLon = planetLon(body, jdStart);
    for (const asp of ASPECTS) {
      for (const target of [norm(pLon + asp), norm(pLon - asp)]) {
        // When did the Moon last cross this longitude before the ingress?
        const hit = findMoonCrossing(target, julianDay(dayStart) - 1, ingressJd);
        if (hit && (!latestAspect || hit > latestAspect)) latestAspect = hit;
      }
    }
  }
  // Also check Sun aspects
  const sLon = sunLon(jdStart);
  for (const asp of ASPECTS) {
    for (const target of [norm(sLon + asp), norm(sLon - asp)]) {
      const hit = findMoonCrossing(target, julianDay(dayStart) - 1, ingressJd);
      if (hit && (!latestAspect || hit > latestAspect)) latestAspect = hit;
    }
  }

  if (!latestAspect) return null;
  return new Date((latestAspect - 2440587.5) * 86400000).toISOString();
}

// Find the last time the Moon crossed targetLon in [jdStart, jdEnd).
function findMoonCrossing(targetLon, jdStart, jdEnd) {
  const step = 1 / 24; // 1-hour steps
  let best = null;
  let prevDiff = ((moonLon(jdStart) - targetLon + 540) % 360) - 180;
  for (let jd = jdStart + step; jd <= jdEnd; jd += step) {
    const diff = ((moonLon(jd) - targetLon + 540) % 360) - 180;
    if (prevDiff <= 0 && diff > 0 || prevDiff >= 0 && diff < 0) {
      // Bisect to find the exact crossing
      let lo = jd - step, hi = jd;
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) / 2;
        const d = ((moonLon(mid) - targetLon + 540) % 360) - 180;
        if ((prevDiff <= 0 && d <= 0) || (prevDiff > 0 && d > 0)) lo = mid; else hi = mid;
      }
      const crossing = (lo + hi) / 2;
      if (crossing < jdEnd && (!best || crossing > best)) best = crossing;
    }
    prevDiff = diff;
  }
  return best;
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

// Lucky colour for the personal layer: combine day stem element, moon element and
// the user's weakest 五行, hashed by date so it doesn't repeat day to day.
export function personalColor(profile, dateStr, moonSign) {
  const moonEl = moonSign % 4; // fire/earth/air/water → mapped to 五行 loosely
  const lucky = profile.wuxing.luckyElement;
  const dayKey = dateStr + lucky;
  const h = hash(dayKey);
  // Pick from the lucky element's colour set, rotated by hash
  return { element: lucky, index: h % 3 };
}

// Moon's relationship to the user's natal Moon and Ascendant.
export function moonNatalLinks(profile, moonSign) {
  const links = [];
  const natalMoon = profile.moon;
  const sep = Math.abs(moonSign - natalMoon);
  const dist = Math.min(sep, 12 - sep);
  if (dist === 0) links.push({ body: 'moon', aspect: 0 }); // conjunct natal Moon
  else if (dist === 4) links.push({ body: 'moon', aspect: 4 }); // trine
  else if (dist === 6) links.push({ body: 'moon', aspect: 6 }); // opposition
  else if (dist === 3) links.push({ body: 'moon', aspect: 3 }); // square

  if (profile.rising != null) {
    const rSep = Math.abs(moonSign - profile.rising);
    const rDist = Math.min(rSep, 12 - rSep);
    if (rDist === 0) links.push({ body: 'rising', aspect: 0 });
    else if (rDist === 4) links.push({ body: 'rising', aspect: 4 });
    else if (rDist === 6) links.push({ body: 'rising', aspect: 6 });
  }
  return links;
}

// Everything the screens show for one day: the sky now, the almanac for the device's
// local date, the 星座 reading and (with a profile) the 生肖 reading.
export function today(profile, now = new Date()) {
  const s = sky(now);
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const alm = almanac(date);
  const r = profile && reading(profile, s);
  const z = profile && zodiacReading(profile, alm);
  const personal = profile ? {
    tenGod: dayTenGod(profile.wuxing.dayMaster, alm.day[0]),
    moonLinks: moonNatalLinks(profile, s.moon),
    luckyColor: personalColor(profile, date, s.moon),
  } : null;
  return {
    now, date, sky: s, alm,
    hour: hourBranch(now.getHours()),
    reading: r,
    zodiac: z,
    personal,
  };
}
