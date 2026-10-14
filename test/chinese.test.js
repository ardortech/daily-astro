// 農曆 conversion, 生肖 at 立春, 八字 pillars and the 生肖 relation of the day.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solarToLunar, lunarToSolar, lunarMonths, baziFor, almanac, relation, goodHours, hourBranch, zodiacReading } from '../src/astro/chinese.js';

const STEMS = '甲乙丙丁戊己庚辛壬癸', BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const gz = ([s, b]) => STEMS[s] + BRANCHES[b];

test('春節 (農曆正月初一) 2020–2026', () => {
  const spring = { 2020: '2020-01-25', 2021: '2021-02-12', 2022: '2022-02-01', 2023: '2023-01-22', 2024: '2024-02-10', 2025: '2025-01-29', 2026: '2026-02-17' };
  for (const [y, date] of Object.entries(spring)) {
    assert.equal(lunarToSolar(+y, 1, 1), date, `${y}`);
    assert.deepEqual(solarToLunar(date), { year: +y, month: 1, day: 1, leap: false });
  }
});

test('閏月: 2025 閏六月, 2033 閏十一月', () => {
  assert.deepEqual(lunarMonths(2025).filter(m => m.leap), [{ month: 6, leap: true, days: 29 }]);
  assert.equal(lunarMonths(2025).length, 13);
  assert.equal(lunarToSolar(2025, 6, 1, true), '2025-07-25');
  assert.deepEqual(solarToLunar('2025-07-25'), { year: 2025, month: 6, day: 1, leap: true });
  assert.equal(lunarMonths(2033).find(m => m.leap).month, 11);
  assert.deepEqual(solarToLunar('2033-12-22'), { year: 2033, month: 11, day: 1, leap: true });
  // Dates that don't exist.
  assert.equal(lunarToSolar(2024, 6, 1, true), null);
  assert.equal(lunarToSolar(2025, 2, 30), null);
});

test('八字 for 1992-08-14 09:20 Taipei = 壬申 戊申 壬戌 乙巳', () => {
  const b = baziFor('1992-08-14', '09:20', 'taipei', false);
  assert.deepEqual(b.wuxing.pillars.map(gz), ['壬申', '戊申', '壬戌', '乙巳']);
  assert.equal(STEMS[b.wuxing.dayMaster], '壬');
  assert.equal(b.zodiac, 8); // 猴
  assert.equal(b.wuxing.counts.reduce((a, n) => a + n), 8);
  // Without a birth time: three pillars.
  assert.deepEqual(baziFor('1992-08-14', '', 'taipei', true).wuxing.pillars.map(gz), ['壬申', '戊申', '壬戌']);
});

test('生肖 changes at 立春, not 春節', () => {
  // 立春 2024: 2024-02-04 16:27 Taipei. 兔 before, 龍 after.
  assert.equal(baziFor('2024-02-04', '16:00', 'taipei', false).zodiac, 3);
  assert.equal(baziFor('2024-02-04', '17:00', 'taipei', false).zodiac, 4);
  // Between 立春 and 春節 (2024-02-10) it's already 龍.
  assert.equal(baziFor('2024-02-08', '12:00', 'taipei', false).zodiac, 4);
  // Same instant elsewhere: 01:00 in London on 02-04 is 09:00 Taipei, still 兔.
  assert.equal(baziFor('2024-02-04', '01:00', 'london', false).zodiac, 3);
  // Born on 立春 day without a time: uncertain; the day before / after is not.
  assert.equal(baziFor('2024-02-04', '', 'taipei', true).zodiacUncertain, true);
  assert.equal(baziFor('2024-02-03', '', 'taipei', true).zodiacUncertain, false);
  assert.equal(baziFor('2024-02-05', '', 'taipei', true).zodiacUncertain, false);
});

test('relation of the day branch to the year branch', () => {
  const [ZI, CHOU, YIN, MAO, CHEN, SI, WU, WEI, SHEN, YOU, XU, HAI] = [...Array(12).keys()];
  assert.equal(relation(ZI, CHOU), 0); // 子丑六合
  assert.equal(relation(SHEN, ZI), 1); // 申子辰三合
  assert.equal(relation(CHEN, SHEN), 1);
  assert.equal(relation(YIN, YIN), 2); // 比和
  assert.equal(relation(ZI, WEI), 4); // 子未相害
  assert.equal(relation(ZI, MAO), 5); // 子卯刑
  assert.equal(relation(YIN, SI), 4); // 寅巳 is both 害 and 刑; 害 is checked first (prototype order)
  assert.equal(relation(WU, WU), 5); // 午午自刑
  assert.equal(relation(ZI, WU), 6); // 子午沖
  assert.equal(relation(MAO, XU), 0); // 卯戌六合
  assert.equal(relation(ZI, YIN), 3); // 平
  // Every pair maps to exactly one of the 7 relations; 沖 is symmetric.
  for (let d = 0; d < 12; d++) for (let u = 0; u < 12; u++) {
    const r = relation(d, u);
    assert.ok(r >= 0 && r <= 6);
    assert.equal(r === 6, relation(u, d) === 6);
  }
});

test('almanac for 2026-10-13: 庚申日, 開日, 財神正東, real 宜忌', () => {
  const a = almanac('2026-10-13');
  assert.equal(gz(a.day), '庚申');
  assert.equal(gz(a.year), '丙午');
  assert.equal(a.jianchu, 10); // 開
  assert.equal(a.chong, 2); // 沖虎
  assert.equal(a.cai, 0); // 正東
  assert.deepEqual(a.goodHours, [0, 1, 4, 5, 7, 10]); // 子 丑 辰 巳 未 戌
  assert.deepEqual(a.lunar, { year: 2026, month: 9, day: 4, leap: false });
  assert.equal(hourBranch(23), 0);
  assert.equal(hourBranch(9), 5);
  assert.equal(goodHours(8).length, 6);
  // Real 宜/忌 from lunar-javascript, Traditional Chinese
  assert.ok(a.yi.length > 0, '宜 should have entries');
  assert.ok(a.ji.length > 0, '忌 should have entries');
  assert.ok(a.yi.includes('嫁娶'), '2026-10-13 宜 嫁娶');
  assert.ok(a.yi.includes('開市'), '2026-10-13 宜 開市');
  assert.ok(a.ji.includes('安床'), '2026-10-13 忌 安床');
  // All strings should be Traditional Chinese (no simplified 开动纳 etc.)
  for (const w of [...a.yi, ...a.ji]) assert.ok(!/[开动纳启钻进补种医谢]/.test(w), `${w} contains SC`);
});

test('almanac spot-check: 2026-10-14 辛酉 閉日', () => {
  const a = almanac('2026-10-14');
  assert.equal(gz(a.day), '辛酉');
  assert.equal(a.jianchu, 11); // 閉
  assert.ok(a.yi.includes('嫁娶'));
  assert.ok(a.ji.includes('開光'));
  assert.ok(a.ji.includes('栽種'));
  for (const w of [...a.yi, ...a.ji]) assert.ok(!/[开动纳启钻进补种医谢]/.test(w), `${w} SC`);
});

test('almanac spot-check: 2026-01-01 閉日', () => {
  const a = almanac('2026-01-01');
  assert.ok(a.yi.includes('入宅'));
  assert.ok(a.ji.includes('嫁娶'));
  assert.ok(a.ji.includes('開市'));
  for (const w of [...a.yi, ...a.ji]) assert.ok(!/[开动纳启钻进补种医谢]/.test(w), `${w} SC`);
});

test('zodiac reading: +1 整體 when the day stem feeds the 補運 element; 太歲', () => {
  const a = almanac('2026-10-13'); // 庚 = 金, 丙午 year
  const p = { zodiac: 6, wuxing: { luckyElement: 3 } }; // 馬, 補金
  const z = zodiacReading(p, a);
  assert.equal(z.boost, true);
  assert.equal(z.taisui, 0); // 值太歲
  const plain = zodiacReading({ zodiac: 6, wuxing: { luckyElement: 0 } }, a);
  assert.equal(z.scores[0], Math.min(5, plain.scores[0] + 1));
  assert.equal(zodiacReading({ zodiac: 0, wuxing: { luckyElement: 0 } }, a).taisui, 1); // 子 沖 午
});
