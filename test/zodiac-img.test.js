// Paper-cut 生肖 images: 地支 index → file, sizes, and the right animal across 立春.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { zodiacImg } from '../src/lib/zodiac.js';
import { baziFor } from '../src/astro/chinese.js';

test('zodiacImg: 子 = 01 rat … 亥 = 12 pig; png up to 64px, webp above', () => {
  assert.equal(zodiacImg(0, 42), '/zodiac/01-rat-256.png');
  assert.equal(zodiacImg(4, 64), '/zodiac/05-dragon-256.png');
  assert.equal(zodiacImg(4, 65), '/zodiac/05-dragon-512.webp');
  assert.equal(zodiacImg(11, 80), '/zodiac/12-pig-512.webp');
  for (let b = 0; b < 12; b++) for (const s of [42, 80]) assert.ok(existsSync('public' + zodiacImg(b, s)), zodiacImg(b, s));
});

test('the image follows the 生肖 year, which starts at 立春', () => {
  const img = (date, time) => zodiacImg(baziFor(date, time, 'taipei', false).zodiac, 80);
  assert.equal(img('1976-08-14', '09:20'), '/zodiac/05-dragon-512.webp'); // 丙辰
  assert.equal(img('1992-08-14', '09:20'), '/zodiac/09-monkey-512.webp'); // 壬申
  assert.equal(img('1984-06-01', '12:00'), '/zodiac/01-rat-512.webp'); // 甲子
  assert.equal(img('1995-12-25', '12:00'), '/zodiac/12-pig-512.webp'); // 乙亥
  // 2000-01-20 is still 己卯 (rabbit) before 立春 (2000-02-04), then 庚辰 (dragon).
  assert.equal(img('2000-01-20', '12:00'), '/zodiac/04-rabbit-512.webp');
  assert.equal(img('2000-02-03', '12:00'), '/zodiac/04-rabbit-512.webp');
  assert.equal(img('2000-02-05', '12:00'), '/zodiac/05-dragon-512.webp');
});
