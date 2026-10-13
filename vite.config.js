import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';

// Static files from public/ that belong to the app shell.
const PUBLIC_SHELL = ['/manifest.webmanifest', ...readdirSync('public/icons').filter(f => f.endsWith('.png')).map(f => `/icons/${f}`)];

// Emits /sw.js with the exact list of built files to precache, and a version
// derived from that list so each deploy gets a fresh cache.
function serviceWorker() {
  return {
    name: 'sw',
    apply: 'build',
    generateBundle(_, bundle) {
      const built = Object.keys(bundle).filter(f => !f.endsWith('.map')).map(f => '/' + f.replace(/^index\.html$/, ''));
      const precache = [...new Set(['/', ...built.filter(f => f !== '/'), ...PUBLIC_SHELL])];
      const version = createHash('sha256').update(precache.join('\n')).digest('hex').slice(0, 10);
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
