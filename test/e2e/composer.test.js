// 問小吉 composer: the 送出 button must be fully visible on narrow phones.
import { test, expect } from '@playwright/test';

const PROFILE = {
  date: '1992-08-14', time: '09:20', city: 'taipei',
  noTime: false, calendar: 'solar', sun: 4, moon: 10, rising: 6,
};

async function openAskTab(page) {
  await page.goto('/');
  // Seed a profile so the app shows the home tab instead of the birth form
  await page.evaluate(p => localStorage.setItem('astro.profile', JSON.stringify(p)), PROFILE);
  await page.reload();
  await page.waitForSelector('.ask-box', { timeout: 10_000 });
  await page.click('.ask-box');
  await page.waitForSelector('.composer button.send', { timeout: 5_000 });
}

test('送出 button is fully inside the viewport (zh)', async ({ page }) => {
  await openAskTab(page);
  const btn = page.locator('.composer button.send');
  const box = await btn.boundingBox();
  const vp = page.viewportSize();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
  expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
});

test('送出 button visible at 375px width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openAskTab(page);
  const btn = page.locator('.composer button.send');
  const box = await btn.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  expect(box.x).toBeGreaterThanOrEqual(0);
});

test('送出 button visible at 390px width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAskTab(page);
  const btn = page.locator('.composer button.send');
  const box = await btn.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.x).toBeGreaterThanOrEqual(0);
});

test('composer form does not cause horizontal scroll', async ({ page }) => {
  await openAskTab(page);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
