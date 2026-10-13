// Profile ⇄ Supabase row mapping.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toRow, fromRow } from '../src/lib/sync.js';

const uid = '00000000-0000-0000-0000-000000000001';

test('profile with birth time round-trips', () => {
  const p = { date: '1992-08-14', time: '09:20', city: 'taipei', noTime: false, sun: 4, moon: 10, moonUncertain: false, rising: 6 };
  const row = toRow(uid, p, '08:15');
  assert.equal(row.birth_time, '09:20');
  assert.equal(row.push_time, '08:15');
  assert.equal(typeof row.time_zone, 'string');
  // Postgres returns time as HH:MM:SS.
  assert.deepEqual(fromRow({ ...row, birth_time: '09:20:00' }), p);
});

test('unknown birth time stores sun + moon only', () => {
  const p = { date: '1992-08-14', time: '09:20', city: 'taipei', noTime: true, sun: 4, moon: 10, moonUncertain: true, rising: null };
  const row = toRow(uid, p);
  assert.equal(row.birth_time, null);
  assert.equal(row.rising, null);
  assert.equal(row.moon_uncertain, true);
  assert.equal(row.push_time, '07:30');
  const back = fromRow(row);
  assert.equal(back.noTime, true);
  assert.equal(back.rising, null);
  assert.equal(back.moonUncertain, true);
});
