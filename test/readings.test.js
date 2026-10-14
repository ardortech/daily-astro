// Daily readings: verify 7-day anti-repeat and template fallback shape.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailySky } from '../src/astro/index.js';

const HOUSES = ['自我與形象','金錢與價值','溝通與學習','家庭與安全感','創作與戀愛','工作與健康','伴侶與合作','深度與共享資源','遠方與信念','事業與名聲','朋友與社群','休息與內在'];
const SIGNS = ['牡羊','金牛','雙子','巨蟹','獅子','處女','天秤','天蠍','射手','魔羯','水瓶','雙魚'];
const ASPECTS_NAMES = ['合相','半六合','六合','四分相','三分相','梅花相','對分相'];

function templateHeadline(sun, rising, skyRow) {
  const base = rising >= 0 ? rising : sun;
  const house = (skyRow.moon_sign - base + 12) % 12;
  const sep = (skyRow.moon_sign - sun + 12) % 12;
  const aspect = Math.min(sep, 12 - sep);
  const good = [0, 2, 4].includes(aspect);
  return `月亮行經第${house + 1}宮（${HOUSES[house]}），${good ? '順利前行' : '留心調整'}`;
}

test('7-day anti-repeat: 牡羊/獅子 headlines differ across a week', () => {
  const sun = 0, rising = 4;
  const headlines = new Set();
  for (let i = 0; i < 7; i++) {
    const d = new Date(2026, 9, 13 + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const sky = dailySky(dateStr);
    headlines.add(templateHeadline(sun, rising, sky));
  }
  assert.ok(headlines.size >= 3, `Expected at least 3 distinct headlines over 7 days, got ${headlines.size}`);
});

test('7-day anti-repeat: all 12 sun signs get variety over a week', () => {
  for (let sun = 0; sun < 12; sun++) {
    const headlines = new Set();
    for (let i = 0; i < 7; i++) {
      const d = new Date(2026, 9, 13 + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const sky = dailySky(dateStr);
      headlines.add(templateHeadline(sun, -1, sky));
    }
    assert.ok(headlines.size >= 2, `Sun ${sun}: expected at least 2 distinct headlines, got ${headlines.size}`);
  }
});

test('dailySky produces different moon_sign values over 7 days', () => {
  const signs = new Set();
  for (let i = 0; i < 7; i++) {
    const d = new Date(2026, 9, 13 + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    signs.add(dailySky(dateStr).moon_sign);
  }
  assert.ok(signs.size >= 3, `Expected at least 3 different moon signs over 7 days, got ${signs.size}`);
});
