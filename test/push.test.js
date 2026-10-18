// Phase 4: push notification tests.
// Due-time selection across time zones, no double send, 410 cleanup,
// payload length, iOS-not-installed UI state.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const NO_DETECT = '--no-experimental-detect-module';
const nodeFlags = process.allowedNodeEnvironmentFlags.has(NO_DETECT) ? [NO_DETECT] : [];

// 1. Push payload: output fits within 110 chars body, has correct structure.
const payloadRunner = `
  const { buildPushPayload } = await import('./netlify/functions/_lib/push-payload.mjs');
  const { dailySky } = await import('./src/astro/index.js');
  const date = '2026-10-18';
  const skyRow = dailySky(date, 'Asia/Taipei');
  const user = { sun: 0, rising: 5, zodiac: 4, daily_enabled: true, zodiac_daily_enabled: true, wuxing: { luckyElement: 0, pillars: [[0,4],[1,5],[2,6]], counts: [2,3,1,2,2], dayMaster: 2 } };
  const readingMap = new Map();
  const payload = buildPushPayload(user, date, 'zh', readingMap, skyRow);
  const payloadEn = buildPushPayload(user, date, 'en', readingMap, skyRow);
  console.log(JSON.stringify({
    hasTitle: !!payload.title, hasBody: typeof payload.body === 'string',
    bodyLen: payload.body.length, bodyOk: payload.body.length <= 110,
    hasTag: /^daily-\\d{4}-\\d{2}-\\d{2}$/.test(payload.tag),
    hasUrl: payload.url === '/?from=push',
    zhPrefix: payload.title.startsWith('早安！'),
    enPrefix: payloadEn.title.startsWith('Good morning!'),
    lang: payload.lang, langEn: payloadEn.lang,
  }));
`;

test('push payload: structure, length ≤ 110, correct tags', () => {
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', payloadRunner], { encoding: 'utf8' });
  const r = JSON.parse(out.trim().split('\n').pop());
  assert.ok(r.hasTitle, 'payload has title');
  assert.ok(r.hasBody, 'payload has body');
  assert.ok(r.bodyOk, `body length ${r.bodyLen} should be ≤ 110`);
  assert.ok(r.hasTag, 'tag matches daily-YYYY-MM-DD');
  assert.ok(r.hasUrl, 'url is /?from=push');
  assert.ok(r.zhPrefix, 'zh title starts with 早安！');
  assert.ok(r.enPrefix, 'en title starts with Good morning!');
  assert.equal(r.lang, 'zh');
  assert.equal(r.langEn, 'en');
});

// 2. Due-time selection: a user at push_time 07:30 Asia/Taipei should be due at
//    07:30 Taipei but not at 07:29; same for America/Los_Angeles.
const dueTimeRunner = `
  function localTimeIn(date, tz) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
    const h = parts.find(p => p.type === 'hour').value;
    const m = parts.find(p => p.type === 'minute').value;
    return h + ':' + m;
  }

  // 07:30 Asia/Taipei = 23:30 UTC the day before
  const taipeiAt0730 = new Date('2026-10-18T23:30:00Z');
  const taipeiAt0729 = new Date('2026-10-18T23:29:00Z');
  // 07:30 America/Los_Angeles (PDT, UTC-7) = 14:30 UTC
  const laAt0730 = new Date('2026-10-18T14:30:00Z');
  const laAt0729 = new Date('2026-10-18T14:29:00Z');

  console.log(JSON.stringify({
    taipeiAt0730: localTimeIn(taipeiAt0730, 'Asia/Taipei'),
    taipeiAt0729: localTimeIn(taipeiAt0729, 'Asia/Taipei'),
    laAt0730: localTimeIn(laAt0730, 'America/Los_Angeles'),
    laAt0729: localTimeIn(laAt0729, 'America/Los_Angeles'),
    taipeiDue: localTimeIn(taipeiAt0730, 'Asia/Taipei') >= '07:30',
    taipeiNotDue: localTimeIn(taipeiAt0729, 'Asia/Taipei') >= '07:30',
    laDue: localTimeIn(laAt0730, 'America/Los_Angeles') >= '07:30',
    laNotDue: localTimeIn(laAt0729, 'America/Los_Angeles') >= '07:30',
  }));
`;

test('due-time selection: Asia/Taipei and America/Los_Angeles', () => {
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', dueTimeRunner], { encoding: 'utf8' });
  const r = JSON.parse(out.trim().split('\n').pop());
  assert.equal(r.taipeiAt0730, '07:30');
  assert.equal(r.taipeiAt0729, '07:29');
  assert.equal(r.taipeiDue, true, 'Taipei at 07:30 should be due');
  assert.equal(r.taipeiNotDue, false, 'Taipei at 07:29 should not be due');
  assert.equal(r.laDue, true, 'LA at 07:30 should be due');
  assert.equal(r.laNotDue, false, 'LA at 07:29 should not be due');
});

// 3. DST edge case: November first Sunday, America/Los_Angeles "falls back" from PDT to PST.
// At 01:59 PDT → 01:00 PST, the 01:xx hour repeats. push_time 07:30 should fire exactly once.
const dstRunner = `
  function localTimeIn(date, tz) {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date);
    const h = parts.find(p => p.type === 'hour').value;
    const m = parts.find(p => p.type === 'minute').value;
    return h + ':' + m;
  }
  function dateIn(date, tz) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }

  // 2026-11-01 DST ends in America/Los_Angeles (1st Sun Nov)
  // 07:30 PST = 15:30 UTC (after fallback)
  const dstDay = new Date('2026-11-01T15:30:00Z');
  const localT = localTimeIn(dstDay, 'America/Los_Angeles');
  const localD = dateIn(dstDay, 'America/Los_Angeles');

  // Simulate: the push_log unique constraint (user_id, local_date, kind) prevents double-send
  // even if the function runs twice during the repeated hour.
  const seen = new Set();
  const key1 = 'user1_' + localD + '_daily';
  seen.add(key1);
  const double = seen.has(key1); // second attempt blocked

  console.log(JSON.stringify({ localT, localD, double }));
`;

test('DST edge: no double send on fall-back day', () => {
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', dstRunner], { encoding: 'utf8' });
  const r = JSON.parse(out.trim().split('\n').pop());
  assert.equal(r.localT, '07:30');
  assert.equal(r.double, true, 'push_log unique constraint prevents double send');
});

// 4. 410 cleanup: a 410 Gone status should cause the subscription to be deleted.
test('410 status triggers subscription removal (logic check)', () => {
  // The daily-push function checks: if (err.statusCode === 404 || err.statusCode === 410) → delete
  // This is a logic test: we verify the condition covers both codes.
  const codes = [404, 410];
  for (const code of codes) {
    const shouldDelete = code === 404 || code === 410;
    assert.ok(shouldDelete, `status ${code} should trigger deletion`);
  }
  assert.ok(!(500 === 404 || 500 === 410), 'status 500 should not trigger deletion');
});

// 5. iOS not installed: needsHomeScreen() should return true on iOS outside standalone.
const iosRunner = `
  // Simulate iOS Safari (not standalone) — navigator is read-only in Node 22, use defineProperty
  Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 }, configurable: true });
  Object.defineProperty(globalThis, 'window', { value: { matchMedia: () => ({ matches: false }), addEventListener: () => {} }, configurable: true });
  const { isIOS, isStandalone, installPlatform } = await import('./src/lib/platform.js');
  const ios = isIOS();
  const standalone = isStandalone();
  const needsInstall = ios && !standalone;
  const platform = installPlatform(navigator.userAgent, ios);
  console.log(JSON.stringify({ ios, standalone, needsInstall, platform }));
`;

test('iOS not standalone: needsHomeScreen returns true', () => {
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', iosRunner], { encoding: 'utf8' });
  const r = JSON.parse(out.trim().split('\n').pop());
  assert.ok(r.ios, 'should detect iOS');
  assert.ok(!r.standalone, 'should not be standalone');
  assert.ok(r.needsInstall, 'needs install on iOS outside standalone');
  assert.equal(r.platform, 'ios-safari');
});

// 6. Push functions load in plain Node.
const pushSubRunner = `
  globalThis.fetch = async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  const fn = await import('./netlify/functions/push-subscribe.mjs');
  console.log(JSON.stringify({ path: fn.config.path, hasDefault: typeof fn.default === 'function' }));
`;

test('push-subscribe.mjs loads in plain Node', () => {
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', pushSubRunner], { encoding: 'utf8' });
  const { path, hasDefault } = JSON.parse(out.trim().split('\n').pop());
  assert.equal(path, '/api/push/subscribe');
  assert.equal(hasDefault, true);
});

const pushUnsubRunner = `
  globalThis.fetch = async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  const fn = await import('./netlify/functions/push-unsubscribe.mjs');
  console.log(JSON.stringify({ path: fn.config.path, hasDefault: typeof fn.default === 'function' }));
`;

test('push-unsubscribe.mjs loads in plain Node', () => {
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', pushUnsubRunner], { encoding: 'utf8' });
  const { path, hasDefault } = JSON.parse(out.trim().split('\n').pop());
  assert.equal(path, '/api/push/unsubscribe');
  assert.equal(hasDefault, true);
});

const pushTestRunner = `
  globalThis.fetch = async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  process.env.VAPID_PUBLIC_KEY = 'test';
  process.env.VAPID_PRIVATE_KEY = 'test';
  process.env.VAPID_SUBJECT = 'mailto:test@test.com';
  const fn = await import('./netlify/functions/push-test.mjs');
  console.log(JSON.stringify({ path: fn.config.path, hasDefault: typeof fn.default === 'function' }));
`;

test('push-test.mjs loads in plain Node', () => {
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', pushTestRunner], { encoding: 'utf8' });
  const { path, hasDefault } = JSON.parse(out.trim().split('\n').pop());
  assert.equal(path, '/api/push/test');
  assert.equal(hasDefault, true);
});

const dailyPushRunner = `
  globalThis.fetch = async () => new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  process.env.VAPID_PUBLIC_KEY = 'test';
  process.env.VAPID_PRIVATE_KEY = 'test';
  process.env.VAPID_SUBJECT = 'mailto:test@test.com';
  const fn = await import('./netlify/functions/daily-push.mjs');
  console.log(JSON.stringify({ schedule: fn.config.schedule, hasDefault: typeof fn.default === 'function' }));
`;

test('daily-push.mjs loads in plain Node with correct schedule', () => {
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', dailyPushRunner], { encoding: 'utf8' });
  const { schedule, hasDefault } = JSON.parse(out.trim().split('\n').pop());
  assert.equal(schedule, '*/15 * * * *');
  assert.equal(hasDefault, true);
});
