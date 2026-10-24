import { test, expect } from '@playwright/test';

const PROFILE = {
  date: '1992-08-14', time: '09:20', city: 'taipei',
  noTime: false, calendar: 'solar', sun: 4, moon: 10, rising: 6,
};

async function seedAndGo(page) {
  await page.goto('/');
  await page.evaluate(p => localStorage.setItem('astro.profile', JSON.stringify(p)), PROFILE);
  await page.reload();
  await page.waitForSelector('[role="tabpanel"]', { timeout: 10_000 });
}

async function assertNoOverflow(page, vw) {
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollW).toBeLessThanOrEqual(vw);

  const overflows = await page.evaluate((vpW) => {
    function inScrollable(el) {
      let p = el.parentElement;
      while (p && p !== document.documentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
        p = p.parentElement;
      }
      return false;
    }
    const bad = [];
    for (const el of document.querySelectorAll('*')) {
      const style = getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'sticky') continue;
      if (inScrollable(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > vpW + 1) {
        const tag = el.tagName;
        const cls = el.className ? `.${String(el.className).split(' ')[0]}` : '';
        bad.push(`${tag}${cls} right=${r.right.toFixed(0)}`);
      }
    }
    return bad;
  }, vw);
  expect(overflows, `Elements overflowing at ${vw}px`).toEqual([]);
}

const TABS = ['home', 'astro', 'zodiac', 'feed', 'settings'];
const TAB_LABELS = { home: '首頁', astro: '星座', zodiac: '生肖', feed: '名師', settings: '設定' };

for (const width of [375, 390]) {
  for (const tab of TABS) {
    test(`no overflow on ${tab} tab at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await seedAndGo(page);
      if (tab !== 'home') {
        const btn = page.locator(`.tabs button`, { hasText: TAB_LABELS[tab] });
        await btn.click();
        await page.waitForTimeout(300);
      }
      await assertNoOverflow(page, width);
    });
  }
}
