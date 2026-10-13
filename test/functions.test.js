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
