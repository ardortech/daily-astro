import { useEffect, useState } from 'preact/hooks';
import { installPlatform, isStandalone, isIOS, installPrompt, onInstallChange, promptInstall } from '../lib/platform.js';
import { store } from '../lib/store.js';
import { t } from '../i18n';

const KEY = 'astro.installGuideDismissed';
const PREVIEW_KEY = 'astro.previewSkip';
const PRODUCTION_HOST = 'astro.klchang.com.tw';

function isPreviewSkip() {
  if (typeof location === 'undefined') return false;
  if (location.hostname === PRODUCTION_HOST) return false;
  try {
    if (sessionStorage.getItem(PREVIEW_KEY)) return true;
    if (new URLSearchParams(location.search).get('skipinstall') === '1') {
      sessionStorage.setItem(PREVIEW_KEY, '1');
      return true;
    }
  } catch { /* private browsing */ }
  return false;
}

export const previewActive = () => {
  if (typeof location === 'undefined') return false;
  if (location.hostname === PRODUCTION_HOST) return false;
  try { return !!sessionStorage.getItem(PREVIEW_KEY); } catch { return false; }
};

const BLOCKING = ['ios-safari', 'ios-chrome', 'ios-other', 'inapp'];
const ANDROID = ['android', 'samsung'];
export const needsInstall = () => !isPreviewSkip() && !isStandalone() && BLOCKING.includes(installPlatform());

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

// Step icons
const StepIcon = ({ glyph }) => (
  <span class="step-icon" aria-hidden="true">{glyph}</span>
);

function Step({ num, icon, children }) {
  return (
    <li class="ig-step">
      <span class="ig-num">{num}</span>
      {icon && <StepIcon glyph={icon} />}
      <span>{children}</span>
    </li>
  );
}

function BrowserSection({ title, children }) {
  return (
    <div class="ig-browser">
      <div class="ig-browser-title">{title}</div>
      {children}
    </div>
  );
}

function IPhoneSteps() {
  const I = t.install;
  return (
    <>
      <BrowserSection title="Safari">
        <ol class="ig-steps">
          <Step num="1" icon="⋯">{I.safariStep1}</Step>
          <Step num="2" icon="＋">{I.safariStep2}</Step>
          <Step num="3">{I.safariStep3}</Step>
        </ol>
      </BrowserSection>
      <BrowserSection title={I.chromeIosTitle}>
        <ol class="ig-steps">
          <Step num="1" icon="⬆">{I.chromeIosStep1}</Step>
          <Step num="2" icon="＋">{I.chromeIosStep2}</Step>
        </ol>
      </BrowserSection>
    </>
  );
}

function AndroidSteps() {
  const I = t.install;
  const { prompt } = useInstallState();
  return (
    <>
      <BrowserSection title="Chrome">
        {prompt ? (
          <div class="ig-install-btn">
            <p>{I.androidBody}</p>
            <button type="button" class="primary" onClick={promptInstall}>{I.androidInstall}</button>
          </div>
        ) : (
          <ol class="ig-steps">
            <Step num="1" icon="⋮">{I.chromeStep1}</Step>
            <Step num="2">{I.chromeStep2}</Step>
            <Step num="3">{I.chromeStep3}</Step>
          </ol>
        )}
      </BrowserSection>
      <BrowserSection title="Samsung Internet">
        <ol class="ig-steps">
          <Step num="1" icon="≡">{I.samsungStep1}</Step>
          <Step num="2">{I.samsungStep2}</Step>
        </ol>
      </BrowserSection>
    </>
  );
}

function InAppGuide({ toast }) {
  const I = t.install;
  return (
    <div class="ig-inapp">
      <div class="ig-inapp-title">{I.inappTitle}</div>
      <p>{I.inappBody}</p>
      <ul class="ig-steps">
        <li class="ig-step"><span>{I.inappLine}</span></li>
        <li class="ig-step"><span>{I.inappOther}</span></li>
      </ul>
      <button type="button" class="primary" onClick={() => copyLink(toast)}>{I.copyLink}</button>
    </div>
  );
}

export function GuideContent({ toast }) {
  const platform = installPlatform();
  const iphoneDefault = platform.startsWith('ios') || platform === 'inapp';
  const [tab, setTab] = useState(iphoneDefault ? 'iphone' : 'android');
  const I = t.install;

  if (platform === 'inapp') {
    return <InAppGuide toast={toast} />;
  }

  return (
    <div class="ig">
      <div class="ig-seg" role="tablist">
        <button role="tab" aria-selected={tab === 'iphone'} class={tab === 'iphone' ? 'active' : ''} onClick={() => setTab('iphone')}>{I.iphone}</button>
        <button role="tab" aria-selected={tab === 'android'} class={tab === 'android' ? 'active' : ''} onClick={() => setTab('android')}>{I.android}</button>
      </div>
      {tab === 'iphone' ? <IPhoneSteps /> : <AndroidSteps />}
    </div>
  );
}

export function InstallWelcome({ toast }) {
  return (
    <section>
      <div class="card" style="margin-top:14px">
        <h2>{t.install.welcome}</h2>
        <p class="why" style="margin:2px 0 12px">{t.install.welcomeIntro}</p>
        <GuideContent toast={toast} />
      </div>
    </section>
  );
}

export function InstallGuide({ toast }) {
  const platform = installPlatform();
  const { installed } = useInstallState();
  const [dismissed, setDismissed] = useState(() => store.get(KEY, false));
  const android = ANDROID.includes(platform);
  if (installed || dismissed || !(android || BLOCKING.includes(platform))) return null;
  const dismiss = () => { store.set(KEY, true); setDismissed(true); };
  return (
    <aside class="install" aria-labelledby="install-title">
      <b id="install-title">{t.install.title}</b>
      <GuideContent toast={toast} />
      <div class="ig-dismiss">
        <button type="button" onClick={dismiss}>{android ? t.install.later : t.install.dismiss}</button>
      </div>
    </aside>
  );
}

export function PreviewBadge() {
  if (!previewActive()) return null;
  return <div class="preview-badge">預覽模式</div>;
}
