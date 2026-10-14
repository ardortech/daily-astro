// 問吉光: handler tests via child process (same approach as functions.test.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const NO_DETECT = '--no-experimental-detect-module';
const nodeFlags = process.allowedNodeEnvironmentFlags.has(NO_DETECT) ? [NO_DETECT] : [];

function runAsk(method, headers = {}, body = null) {
  const script = `
    globalThis.fetch = async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
    process.env.ANTHROPIC_API_KEY = 'test_key';
    const fn = await import('./netlify/functions/ask.mjs');
    const req = new Request('https://example.com/api/ask', {
      method: ${JSON.stringify(method)},
      headers: ${JSON.stringify(headers)},
      ${body ? `body: ${JSON.stringify(JSON.stringify(body))},` : ''}
    });
    const res = await fn.default(req);
    const data = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
    console.log(JSON.stringify({ status: res.status, data, cors: res.headers.get('access-control-allow-origin') }));
  `;
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', script], { encoding: 'utf8' });
  return JSON.parse(out.trim().split('\n').pop());
}

test('CORS: OPTIONS returns 204 with proper headers', () => {
  const r = runAsk('OPTIONS');
  assert.equal(r.status, 204);
  assert.equal(r.cors, '*');
});

test('GET returns 405 method not allowed', () => {
  const r = runAsk('GET');
  assert.equal(r.status, 405);
});

test('POST without auth returns 401', () => {
  const r = runAsk('POST', { 'content-type': 'application/json' }, { question: '明天穿什麼顏色？' });
  assert.equal(r.status, 401);
  assert.equal(r.data.error, 'unauthorized');
});

test('ask.mjs config path is /api/ask', () => {
  const script = `
    globalThis.fetch = async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
    process.env.ANTHROPIC_API_KEY = 'test_key';
    const fn = await import('./netlify/functions/ask.mjs');
    console.log(JSON.stringify({ path: fn.config.path, hasDefault: typeof fn.default === 'function' }));
  `;
  const out = execFileSync(process.execPath, [...nodeFlags, '--input-type=module', '-e', script], { encoding: 'utf8' });
  const { path, hasDefault } = JSON.parse(out.trim().split('\n').pop());
  assert.equal(path, '/api/ask');
  assert.equal(hasDefault, true);
});
