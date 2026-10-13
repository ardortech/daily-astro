// Guards the Phase 1 port of the prototype's math. Phase 2 (astronomy-engine)
// should keep these sign results; tighten to degree checks then.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartFor, reading, sky, phaseIndex, hash, ITEM_COUNT } from '../src/astro/index.js';

test('prototype sample: 1992-08-14 09:20 Taipei', () => {
  // Sun ~21° Leo; sunrise ~05:30 with Leo rising, Virgo takes ~2¼h, so 09:20 → early Libra.
  const c = chartFor('1992-08-14', '09:20', 'taipei', false);
  assert.equal(c.sun, 4);
  assert.equal(c.rising, 6);
});

test('unknown birth time drops rising', () => {
  assert.equal(chartFor('1992-08-14', '09:20', 'taipei', true).rising, null);
});

test('sun sign boundaries', () => {
  assert.equal(chartFor('2000-03-25', '12:00', 'london', false).sun, 0); // Aries
  assert.equal(chartFor('2000-12-25', '12:00', 'london', false).sun, 9); // Capricorn
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
