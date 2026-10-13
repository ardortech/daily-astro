// Chart math (astronomy-engine), IANA time-zone conversion, and reading invariants.
// Reference charts are AA-rated public birth data. Degrees were cross-checked
// against an independent ephemeris (circular-natal-horoscope-js) to ±0.01°.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartFor, reading, sky, phaseIndex, hash, ITEM_COUNT, CITIES, cityById, zonedToUtc, dailySky, moonIngress, dayBounds } from '../src/astro/index.js';
import { julianDay, sunLon, moonLon, ascendant } from '../src/astro/math.js';

const [ARI, TAU, GEM, CAN, LEO, VIR, LIB, SCO, SAG, CAP, AQU, PIS] = [...Array(12).keys()];

// Longitudes (0–360) for a local birth time in one of our cities.
function lons(date, time, cityId) {
  const c = cityById(cityId);
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const jd = julianDay(zonedToUtc(y, m, d, hh, mm, c.tz));
  return { sun: sunLon(jd), moon: moonLon(jd), asc: ascendant(jd, c.lat, c.lon) };
}
const near = (actual, expected, tol, what) =>
  assert.ok(Math.abs(((actual - expected + 540) % 360) - 180) <= tol, `${what}: ${actual.toFixed(3)} vs ${expected}`);

const CHARTS = [
  // name, date, local time, city, [sun, moon, rising], published degrees [sun, moon, asc] or null
  ['Barack Obama, Honolulu (HST, no DST)', '1961-08-04', '19:24', 'honolulu', [LEO, GEM, AQU], [132.55, 63.35, 318.05]],
  ['King Charles III, London (GMT)', '1948-11-14', '21:14', 'london', [SCO, TAU, LEO], [232.42, 30.43, 125.40]],
  ['Steve Jobs, San Francisco (PST)', '1955-02-24', '19:15', 'sanfrancisco', [PIS, ARI, VIR], [335.77, 7.75, 172.29]],
  // US daylight saving time: 10:00 CDT = 15:00 UTC. Read as CST, rising would be Scorpio.
  ['Beyoncé, Houston (CDT, daylight saving)', '1981-09-04', '10:00', 'houston', [VIR, SCO, LIB], [161.98, 230.90, 200.27]],
  // The app's sample chart, Taipei.
  ['Sample, Taipei (CST)', '1992-08-14', '09:20', 'taipei', [LEO, AQU, LIB], [141.51, 328.25, 192.92]],
];

for (const [name, date, time, city, [sun, moon, rising], deg] of CHARTS) {
  test(`chart: ${name}`, () => {
    assert.deepEqual(chartFor(date, time, city, false), { sun, moon, rising, moonUncertain: false });
    const l = lons(date, time, city);
    near(l.sun, deg[0], 0.05, 'sun');
    near(l.moon, deg[1], 0.05, 'moon');
    near(l.asc, deg[2], 0.1, 'asc');
  });
}

test('DST changes the result: Beyoncé read as standard time gets Scorpio rising', () => {
  const c = cityById('houston');
  const jd = julianDay(new Date('1981-09-04T16:00:00Z')); // 10:00 CST, the wrong reading
  assert.equal(Math.floor(ascendant(jd, c.lat, c.lon) / 30), SCO);
});

test('IANA conversion: DST, historical offsets, gaps and overlaps', () => {
  const iso = (...a) => zonedToUtc(...a).toISOString().slice(0, 16);
  assert.equal(iso(1981, 9, 4, 10, 0, 'America/Chicago'), '1981-09-04T15:00'); // CDT
  assert.equal(iso(1981, 1, 4, 10, 0, 'America/Chicago'), '1981-01-04T16:00'); // CST
  assert.equal(iso(1979, 7, 1, 12, 0, 'Asia/Taipei'), '1979-07-01T03:00'); // Taiwan DST 1979
  assert.equal(iso(1990, 7, 1, 12, 0, 'Asia/Shanghai'), '1990-07-01T03:00'); // China DST 1986–91
  assert.equal(iso(1975, 7, 1, 12, 0, 'Asia/Kuala_Lumpur'), '1975-07-01T04:30'); // UTC+7:30 until 1982
  assert.equal(iso(2024, 7, 1, 12, 0, 'Europe/London'), '2024-07-01T11:00'); // BST
  assert.equal(iso(2024, 1, 15, 12, 0, 'Australia/Sydney'), '2024-01-15T01:00'); // AEDT
  // 02:30 doesn't exist on 2024-03-10 in New York: treated as 02:30 EST.
  assert.equal(iso(2024, 3, 10, 2, 30, 'America/New_York'), '2024-03-10T07:30');
  // 01:30 happens twice on 2024-11-03: the first (EDT) one is used.
  assert.equal(iso(2024, 11, 3, 1, 30, 'America/New_York'), '2024-11-03T05:30');
  const [s, e] = dayBounds('2024-03-10', 'America/New_York');
  assert.equal(e - s, 23 * 3600e3);
});

test('every city has coordinates and a valid IANA zone', () => {
  assert.ok(CITIES.length >= 50);
  assert.equal(new Set(CITIES.map(c => c.id)).size, CITIES.length);
  for (const c of CITIES) {
    assert.ok(Math.abs(c.lat) < 70 && Math.abs(c.lon) <= 180, c.id);
    assert.doesNotThrow(() => new Intl.DateTimeFormat('en', { timeZone: c.tz }), c.tz);
  }
});

test('unknown birth time: sun + moon only, moon flagged when it changes sign that day', () => {
  // 1992-08-14 Taipei: Moon enters Pisces at 12:50 local.
  assert.deepEqual(chartFor('1992-08-14', '09:20', 'taipei', true), { sun: LEO, moon: AQU, rising: null, moonUncertain: true });
  assert.deepEqual(chartFor('1992-08-16', '', 'taipei', true), { sun: LEO, moon: PIS, rising: null, moonUncertain: false });
  const [s, e] = dayBounds('1992-08-14', 'Asia/Taipei');
  assert.equal(moonIngress(s, e).toISOString().slice(0, 16), '1992-08-14T04:50');
});

test('dailySky row for the Taipei day', () => {
  const row = dailySky('2026-10-14');
  assert.equal(row.date, '2026-10-14');
  assert.equal(row.moon_sign, SCO);
  assert.ok(row.moon_lon >= 210 && row.moon_lon < 240);
  assert.ok(row.phase >= 0 && row.phase < 360);
  // Moon enters Sagittarius at ~08:59 Taipei time.
  assert.match(row.moon_sign_change_at, /^2026-10-14T00:5\d/);
  assert.equal(dailySky('2026-10-13').moon_sign_change_at, null);
});

test('sun sign boundaries', () => {
  assert.equal(chartFor('2000-03-25', '12:00', 'london', false).sun, ARI);
  assert.equal(chartFor('2000-12-25', '12:00', 'london', false).sun, CAP);
});

test('full moon 2024-09-18 reads as 滿月', () => {
  assert.equal(phaseIndex(sky(new Date('2024-09-18T02:34:00Z')).phase), 4);
});

test('reading always yields a lucky item and 1–5 stars', () => {
  const p = chartFor('1992-08-14', '09:20', 'taipei', false);
  for (let day = 0; day < 400; day++) {
    const r = reading(p, sky(new Date(Date.UTC(2026, 0, 1 + day, 3))));
    assert.ok(r.item >= 0 && r.item < ITEM_COUNT, `item ${r.item}`);
    assert.ok(r.color >= 0 && r.color < 3);
    for (const s of r.scores) assert.ok(s >= 1 && s <= 5, `score ${s}`);
  }
  assert.ok(hash('x') >= 0);
});
