// Profile ⇄ Supabase row mapping.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toRow, fromRow } from '../src/lib/sync.js';
import { profileFor } from '../src/astro/index.js';

const uid = '00000000-0000-0000-0000-000000000001';
// Postgres returns time as HH:MM:SS.
const roundTrip = row => fromRow({ ...row, birth_time: row.birth_time && `${row.birth_time}:00` });

test('profile with birth time round-trips', () => {
  const p = profileFor({ date: '1992-08-14', time: '09:20', city: 'taipei', noTime: false, calendar: 'solar' });
  const row = toRow(uid, p, { pushTime: '08:15', daily: false, zodiacDaily: false });
  assert.equal(row.birth_time, '09:20');
  assert.equal(row.push_time, '08:15');
  assert.equal(row.daily_enabled, false);
  assert.equal(row.zodiac_daily_enabled, false);
  assert.equal(typeof row.time_zone, 'string');
  assert.equal(row.birth_calendar, 'solar');
  assert.deepEqual([row.lunar_year, row.lunar_month, row.lunar_day, row.lunar_leap], [1992, 7, 16, false]);
  assert.equal(row.zodiac, 8); // 猴
  assert.equal(row.zodiac_uncertain, false);
  assert.deepEqual(row.wuxing.pillars, [[8, 8], [4, 8], [8, 10], [1, 5]]); // 壬申 戊申 壬戌 乙巳
  assert.equal(row.wuxing.day_master, 8);
  assert.deepEqual(roundTrip(row), p);
});

test('unknown birth time stores sun + moon only; 農曆 entry is remembered', () => {
  const p = profileFor({ date: '2024-02-04', time: '09:20', city: 'taipei', noTime: true, calendar: 'lunar' });
  const row = toRow(uid, p);
  assert.equal(row.birth_time, null);
  assert.equal(row.rising, null);
  assert.equal(row.birth_calendar, 'lunar');
  assert.equal(row.zodiac_uncertain, true); // 立春 2024-02-04 16:27 Taipei
  assert.equal(row.wuxing.pillars.length, 3);
  assert.equal(row.push_time, '07:30');
  assert.equal(row.daily_enabled, true);
  assert.equal(row.zodiac_daily_enabled, true);
  const back = fromRow(row);
  assert.equal(back.noTime, true);
  assert.equal(back.rising, null);
  assert.equal(back.calendar, 'lunar');
  assert.equal(back.zodiacUncertain, true);
});

test('rows saved before the 生肖 migration still load', () => {
  const back = fromRow({ birth_date: '1992-08-14', birth_time: '09:20:00', city_id: 'taipei', sun: 4, moon: 10, sun_uncertain: false, moon_uncertain: false, rising: 6 });
  assert.equal(back.calendar, 'solar');
  assert.equal(back.lunar, null);
  assert.equal(back.wuxing, undefined);
  assert.equal(profileFor(back).zodiac, 8);
});
