import { useState } from 'preact/hooks';
import { isIOS, isIOSSafari, isStandalone } from '../lib/platform.js';
import { store } from '../lib/store.js';
import { t } from '../i18n';

const KEY = 'astro.installGuideDismissed';

// iOS Safari's share glyph (square with up arrow).
const ShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-label={t.install.shareAria} role="img">
    <path d="M12 3v12M8 7l4-4 4 4" /><path d="M7 10H5.5A1.5 1.5 0 0 0 4 11.5v8A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 18.5 10H17" />
  </svg>
);

// iPhone/iPad opened in the browser instead of from the Home Screen. iOS has no
// install prompt, web push only works installed, and the Home Screen app has its
// own storage, so birth details are only collected inside the installed app.
export const needsInstall = () => isIOS() && !isStandalone();

function Card({ onDismiss }) {
  const I = t.install;
  return (
    <aside class="install" aria-labelledby="install-title">
      <div class="ic"><ShareIcon /></div>
      <div>
        <b id="install-title">{I.title}</b>
        {isIOSSafari()
          ? <><p>{I.body}</p><p class="sub">{I.ios26}</p></>
          : <p>{I.otherBrowser}</p>}
      </div>
      {onDismiss && <button type="button" onClick={onDismiss}>{I.dismiss}</button>}
    </aside>
  );
}

// First screen on iPhone Safari before the app is installed: welcome + how to install, no form.
export function InstallWelcome() {
  return (
    <section>
      <div class="card" style="margin-top:14px">
        <h2>{t.install.welcome}</h2>
        <p class="why" style="margin:2px 0 12px">{t.install.welcomeIntro}</p>
        <Card />
      </div>
    </section>
  );
}

// Dismissible banner for a profile that already exists in Safari (saved before this flow).
export function InstallGuide() {
  const [hidden, setHidden] = useState(() => !needsInstall() || store.get(KEY, false));
  if (hidden) return null;
  return <Card onDismiss={() => { store.set(KEY, true); setHidden(true); }} />;
}
