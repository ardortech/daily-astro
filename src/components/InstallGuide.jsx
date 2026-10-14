import { useEffect, useState } from 'preact/hooks';
import { installPlatform, isStandalone, installPrompt, onInstallChange, promptInstall } from '../lib/platform.js';
import { store } from '../lib/store.js';
import { t } from '../i18n';

const KEY = 'astro.installGuideDismissed';

// iOS share glyph (square with up arrow); a download arrow for Android installs; a link for in-app browsers.
const ICONS = {
  share: <path d="M12 3v12M8 7l4-4 4 4M7 10H5.5A1.5 1.5 0 0 0 4 11.5v8A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 18.5 10H17" />,
  install: <path d="M12 3v12M7 10l5 5 5-5M5 20h14" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
};
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-label={t.install.shareAria} role="img">{ICONS[name]}</svg>
);

// iPhone browsers and in-app browsers: the Home Screen app has its own storage (and in-app
// browsers can't install at all), so birth details are only collected after installing.
// Android installs from a card above the form instead; desktop shows no card.
const BLOCKING = ['ios-safari', 'ios-chrome', 'ios-other', 'inapp'];
const ANDROID = ['android', 'samsung'];
export const needsInstall = () => !isStandalone() && BLOCKING.includes(installPlatform());

// Re-render when the install prompt arrives or the app gets installed.
function useInstallState() {
  const [, bump] = useState(0);
  useEffect(() => onInstallChange(() => bump(n => n + 1)), []);
  return { installed: isStandalone(), prompt: installPrompt() };
}

function copyLink(toast) {
  const url = location.href;
  const done = () => toast?.(t.install.copied);
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, () => window.prompt('', url));
  else window.prompt('', url);
}

function Card({ platform, onDismiss, dismissLabel, toast }) {
  const I = t.install;
  const { prompt } = useInstallState();
  let icon = 'share', title = I.title, body;
  if (platform === 'ios-safari') body = <><p>{I.body}</p><p class="sub">{I.ios26}</p></>;
  else if (platform === 'ios-chrome') body = <p>{I.iosChrome}</p>;
  else if (platform === 'ios-other') body = <p>{I.iosOther}</p>;
  else if (platform === 'inapp') { icon = 'link'; title = I.inappTitle; body = <p>{I.inapp}</p>; }
  else if (platform === 'samsung') { icon = 'install'; title = I.androidTitle; body = <p>{I.samsung}</p>; }
  else { icon = 'install'; title = I.androidTitle; body = <p>{prompt ? I.androidBody : I.androidFallback}</p>; }

  const action = platform === 'inapp'
    ? <button type="button" class="go" onClick={() => copyLink(toast)}>{I.copyLink}</button>
    : platform === 'android' && prompt
      ? <button type="button" class="go" onClick={promptInstall}>{I.androidInstall}</button>
      : null;

  return (
    <aside class="install" aria-labelledby="install-title">
      <div class="ic"><Icon name={icon} /></div>
      <div>
        <b id="install-title">{title}</b>
        {body}
      </div>
      {(action || onDismiss) && (
        <div class="actions">
          {onDismiss && <button type="button" onClick={onDismiss}>{dismissLabel}</button>}
          {action}
        </div>
      )}
    </aside>
  );
}

// First screen on iPhone / in-app browsers before the app is installed: welcome + how to install, no form.
export function InstallWelcome({ toast }) {
  return (
    <section>
      <div class="card" style="margin-top:14px">
        <h2>{t.install.welcome}</h2>
        <p class="why" style="margin:2px 0 12px">{t.install.welcomeIntro}</p>
        <Card platform={installPlatform()} toast={toast} />
      </div>
    </section>
  );
}

// In-flow card above the form or tabs: Android (install button or menu steps, 稍後), and on
// iPhone for a profile saved in the browser before this flow (知道了). Hidden once installed.
export function InstallGuide({ toast }) {
  const platform = installPlatform();
  const { installed } = useInstallState();
  const [dismissed, setDismissed] = useState(() => store.get(KEY, false));
  const android = ANDROID.includes(platform);
  if (installed || dismissed || !(android || BLOCKING.includes(platform))) return null;
  const dismiss = () => { store.set(KEY, true); setDismissed(true); };
  return <Card platform={platform} toast={toast} onDismiss={dismiss} dismissLabel={android ? t.install.later : t.install.dismiss} />;
}
