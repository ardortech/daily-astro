// Home Screen icons, install-guide browser detection and service-worker routing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { installPlatform } from '../src/lib/platform.js';

const UA = {
  iosSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
  iosEdge: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/130.0.2849.80 Mobile/15E148 Safari/605.1.15',
  iosFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15',
  line: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.17.0',
  facebook: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/485.0.0.0]',
  instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0',
  messengerAndroid: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36 [FB_IAB/MESSENGER;FBAV/480.0]',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  androidEdge: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 EdgA/130.0.0.0',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
};

test('install guide per browser', () => {
  const ios = ua => /iPhone/.test(ua);
  const p = ua => installPlatform(ua, ios(ua));
  assert.equal(p(UA.iosSafari), 'ios-safari');
  assert.equal(p(UA.iosChrome), 'ios-chrome');
  assert.equal(p(UA.iosEdge), 'ios-other');
  assert.equal(p(UA.iosFirefox), 'ios-other');
  for (const k of ['line', 'facebook', 'instagram', 'messengerAndroid']) assert.equal(p(UA[k]), 'inapp', k);
  assert.equal(p(UA.androidChrome), 'android');
  assert.equal(p(UA.androidEdge), 'android');
  assert.equal(p(UA.samsung), 'samsung');
  assert.equal(p(UA.mac), 'desktop');
});

test('Home Screen icon is linked statically and shipped at the site root', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon.png">/);
  for (const f of ['apple-touch-icon.png', 'apple-touch-icon-precomposed.png', 'favicon.svg', 'favicon-32.png', 'favicon.ico']) {
    assert.ok(existsSync(`public/${f}`), f);
  }
  // 180×180 PNG: check the signature and IHDR size.
  const png = readFileSync('public/apple-touch-icon.png');
  assert.equal(png.toString('latin1', 1, 4), 'PNG');
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [180, 180]);
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
  assert.deepEqual(manifest.icons.map(i => i.purpose), ['any', 'any', 'maskable']);
  for (const i of manifest.icons) assert.ok(existsSync('public' + i.src), i.src);
});

test('no Netlify redirect can shadow the icons', () => {
  // Netlify serves existing files before non-forced redirects; a forced catch-all
  // (or a _redirects file) would send /apple-touch-icon.png to index.html.
  const toml = readFileSync('netlify.toml', 'utf8');
  assert.doesNotMatch(toml, /force\s*=\s*true/);
  assert.ok(!existsSync('public/_redirects'));
});

test('service worker: page, icons and manifest network-first; hashed assets cache-first', () => {
  const sw = readFileSync('sw/sw.js', 'utf8');
  const FRESH = new RegExp(sw.match(/const FRESH = \/(.+)\/;/)[1]);
  for (const p of ['/', '/index.html', '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png', '/icon-192.png', '/favicon.svg', '/favicon.ico', '/manifest.webmanifest']) {
    assert.ok(FRESH.test(p), p);
  }
  for (const p of ['/assets/index-abc123.js', '/assets/index-abc123.css', '/sw.js']) assert.ok(!FRESH.test(p), p);
});
