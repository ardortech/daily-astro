// Netlify Functions must load in plain Node, the way the functions runtime loads them.
// The runtime may not detect ESM syntax in .js files, so astronomy-engine's ESM build
// (a .js file in a CommonJS package) breaks there while working on a dev machine. The
// child process turns detection off to match; see src/astro/engine.node.cjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const NO_DETECT = '--no-experimental-detect-module';
const nodeFlags = process.allowedNodeEnvironmentFlags.has(NO_DETECT) ? [NO_DETECT] : [];

// Imports the function with fetch stubbed (no network) and runs its handler once.
const runner = `
  globalThis.fetch = async (url, init) => {
    globalThis.calls = (globalThis.calls ?? []).concat([[init?.method, String(url), init?.body]]);
    return new Response('[]', { status: 201, headers: { 'content-type': 'application/json' } });
  };
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  const fn = await import('./netlify/functions/daily-sky.mjs');
  const res = await fn.default();
  console.log(JSON.stringify({ status: res.status, body: await res.json(), schedule: fn.config.schedule, calls: globalThis.calls }));
`;

test('daily-sky loads and runs in plain Node without ESM syntax detection', () => {
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', runner], { encoding: 'utf8' });
  const { status, body, schedule, calls } = JSON.parse(out.trim().split('\n').pop());
  assert.equal(status, 200);
  assert.equal(schedule, '0 16 * * *');
  assert.match(body.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(body.moon_sign >= 0 && body.moon_sign <= 11);
  const [method, url, sent] = calls[0];
  assert.equal(method, 'POST');
  assert.match(url, /\/rest\/v1\/daily_sky\?on_conflict=date$/);
  assert.equal(JSON.parse(sent).date, body.date);
});

// daily-readings (submit): verify it loads and has the right schedule.
const readingsRunner = `
  globalThis.fetch = async (url, init) => {
    globalThis.calls = (globalThis.calls ?? []).concat([[init?.method, String(url), init?.body]]);
    return new Response('[]', { status: 201, headers: { 'content-type': 'application/json' } });
  };
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  process.env.ANTHROPIC_API_KEY = '';
  const fn = await import('./netlify/functions/daily-readings.mjs');
  console.log(JSON.stringify({ schedule: fn.config.schedule, hasDefault: typeof fn.default === 'function' }));
`;

test('daily-readings loads in plain Node', () => {
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', readingsRunner], { encoding: 'utf8' });
  const { schedule, hasDefault } = JSON.parse(out.trim().split('\n').pop());
  assert.equal(schedule, '5 16 * * *');
  assert.equal(hasDefault, true);
});

// daily-readings-collect: verify it loads and has the right schedule.
const collectRunner = `
  globalThis.fetch = async (url, init) => {
    globalThis.calls = (globalThis.calls ?? []).concat([[init?.method, String(url), init?.body]]);
    return new Response('[]', { status: 201, headers: { 'content-type': 'application/json' } });
  };
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  process.env.ANTHROPIC_API_KEY = '';
  const fn = await import('./netlify/functions/daily-readings-collect.mjs');
  console.log(JSON.stringify({ schedule: fn.config.schedule, hasDefault: typeof fn.default === 'function' }));
`;

test('daily-readings-collect loads in plain Node', () => {
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', collectRunner], { encoding: 'utf8' });
  const { schedule, hasDefault } = JSON.parse(out.trim().split('\n').pop());
  assert.equal(schedule, '35 16 * * *');
  assert.equal(hasDefault, true);
});

// Shared readings module: verify key generation and template output shape.
const sharedRunner = `
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  const { allKeys, keyId, parseKeyId, templateFor, parseToolReading, dailySky } = await import('./netlify/functions/_lib/readings.mjs');
  const keys = allKeys();
  const sky = dailySky('2026-10-16');
  const first = keys[0];
  const reading = templateFor(first, sky);
  const kid = keyId(first);
  const parsed = parseKeyId(kid);
  const toolContent = [{ type: 'tool_use', id: 'x', name: 'reading', input: reading }];
  const fromTool = parseToolReading(toolContent);
  console.log(JSON.stringify({
    totalKeys: keys.length,
    kid, parsed,
    hasHeadline: !!reading.headline, hasBody: !!reading.body, hasWatchOut: !!reading.watch_out,
    scoresLen: reading.scores.length, hasChanged: !!reading.what_changed,
    toolParsed: !!fromTool, toolHeadline: fromTool?.headline === reading.headline,
  }));
`;

test('shared readings module: keys, templates and tool parsing', () => {
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', sharedRunner], { encoding: 'utf8' });
  const r = JSON.parse(out.trim().split('\n').pop());
  assert.equal(r.totalKeys, 336);
  assert.equal(r.kid, 'zh_astro_s0_rx');
  assert.deepStrictEqual(r.parsed, { kind: 'astro', lang: 'zh', sun: 0, rising: -1, zodiac: -1 });
  assert.ok(r.hasHeadline);
  assert.ok(r.hasBody);
  assert.ok(r.hasWatchOut);
  assert.equal(r.scoresLen, 4);
  assert.ok(r.hasChanged);
  assert.ok(r.toolParsed);
  assert.ok(r.toolHeadline);
});

// custom_id: every ID matches the Batches API pattern, is unique, and round-trips.
const customIdRunner = `
  const { allKeys, keyId, parseKeyId } = await import('./netlify/functions/_lib/readings.mjs');
  const keys = allKeys();
  const pattern = /^[a-zA-Z0-9_-]{1,64}$/;
  const ids = keys.map(k => keyId(k));
  const badIds = ids.filter(id => !pattern.test(id));
  const uniqueCount = new Set(ids).size;
  const roundTripFails = keys.filter(k => {
    const rt = parseKeyId(keyId(k));
    return rt.kind !== k.kind || rt.lang !== k.lang || rt.sun !== k.sun || rt.rising !== k.rising || rt.zodiac !== k.zodiac;
  });
  console.log(JSON.stringify({ total: ids.length, bad: badIds, unique: uniqueCount, rtFails: roundTripFails.length }));
`;

test('custom_id: valid pattern, unique, round-trips for all 336 keys', () => {
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', customIdRunner], { encoding: 'utf8' });
  const r = JSON.parse(out.trim().split('\n').pop());
  assert.equal(r.total, 336);
  assert.deepStrictEqual(r.bad, [], `IDs not matching Batches API pattern: ${r.bad.join(', ')}`);
  assert.equal(r.unique, 336, 'custom_ids must be unique');
  assert.equal(r.rtFails, 0, 'all keys must round-trip through keyId → parseKeyId');
});

// ask.mjs: verify it loads and has the right path.
const askRunner = `
  globalThis.fetch = async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  process.env.ANTHROPIC_API_KEY = 'test_key';
  const fn = await import('./netlify/functions/ask.mjs');
  console.log(JSON.stringify({ path: fn.config.path, hasDefault: typeof fn.default === 'function' }));
`;

test('ask.mjs loads in plain Node with correct path', () => {
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', askRunner], { encoding: 'utf8' });
  const { path, hasDefault } = JSON.parse(out.trim().split('\n').pop());
  assert.equal(path, '/api/ask');
  assert.equal(hasDefault, true);
});

test('netlify.toml ships the astronomy-engine files the Node entry requires', () => {
  // nft (Netlify's packager for v2 functions) can't trace the require in engine.node.cjs
  // once it is transpiled, so the files are listed in included_files.
  const toml = readFileSync('netlify.toml', 'utf8');
  const included = [...toml.match(/included_files\s*=\s*\[([^\]]*)\]/)[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
  const pkg = JSON.parse(readFileSync('node_modules/astronomy-engine/package.json', 'utf8'));
  const cjsEntry = 'node_modules/astronomy-engine/' + pkg.exports['.'].require.replace(/^\.\//, '');
  for (const f of ['node_modules/astronomy-engine/package.json', cjsEntry]) {
    assert.ok(included.includes(f), `${f} missing from [functions] included_files`);
    assert.ok(existsSync(f), `${f} does not exist`);
  }
});
