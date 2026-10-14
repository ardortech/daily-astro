import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

// Static files from public/ that belong to the app shell (manifest, icons, favicons).
// Plus the paper-cut 生肖 images in public/zodiac/ (shown offline too).
const PUBLIC_SHELL = [
  ...readdirSync('public').filter(f => /\.(webmanifest|png|svg|ico)$/.test(f)).map(f => `/${f}`),
  ...readdirSync('public/zodiac').filter(f => /\.(png|webp)$/.test(f)).sort().map(f => `/zodiac/${f}`),
];

// Emits /sw.js with the exact list of built files to precache, and a version
// derived from that list plus the contents of the public/ shell files and of sw/sw.js,
// so each deploy that changes them (e.g. new icons, same file names) gets a fresh cache.
function serviceWorker() {
  return {
    name: 'sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const built = Object.keys(bundle).filter(f => !f.endsWith('.map')).map(f => '/' + f.replace(/^index\.html$/, ''));
      const precache = [...new Set(['/', ...built.filter(f => f !== '/'), ...PUBLIC_SHELL])];
      const hash = createHash('sha256').update(precache.join('\n'));
      for (const f of PUBLIC_SHELL) hash.update(readFileSync('public' + f));
      hash.update(readFileSync('sw/sw.js')); // a change to the worker's own logic also starts a fresh cache
      const version = hash.digest('hex').slice(0, 10);
      const source = readFileSync('sw/sw.js', 'utf8')
        .replace('__SW_VERSION__', version)
        .replace('__SW_PRECACHE__', JSON.stringify(precache, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  plugins: [preact(), serviceWorker()],
  build: { target: 'es2020' },
});
