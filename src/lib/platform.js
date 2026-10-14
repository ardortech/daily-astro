export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}

// iPhone/iPod, plus iPadOS which reports itself as a Mac with touch.
export function isIOS() {
  const ua = navigator.userAgent;
  return /iPhone|iPod|iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Which install guide fits this browser:
//   inapp        LINE / Facebook / Instagram / Messenger in-app browser (can't install)
//   ios-safari   iPhone Safari (分享 → 加入主畫面)
//   ios-chrome   iPhone Chrome (CriOS)
//   ios-other    iPhone Edge / Firefox / others (generic 分享 → 加入主畫面)
//   samsung      Samsung Internet
//   android      Android Chrome / Edge (beforeinstallprompt)
//   desktop      everything else: no install card
export function installPlatform(ua = navigator.userAgent, ios = isIOS()) {
  if (/\bLine\/|FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger/i.test(ua)) return 'inapp';
  if (ios) {
    if (/CriOS/.test(ua)) return 'ios-chrome';
    if (/EdgiOS|FxiOS|OPiOS|GSA\//.test(ua)) return 'ios-other';
    return 'ios-safari';
  }
  if (/Android/.test(ua)) return /SamsungBrowser/.test(ua) ? 'samsung' : 'android';
  return 'desktop';
}

// Android Chrome / Edge fire beforeinstallprompt (possibly before the UI mounts), so keep it here.
let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach(f => f());
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; notify(); });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; notify(); });
  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', notify);
}
export const installPrompt = () => deferredPrompt;
export function onInstallChange(f) { listeners.add(f); return () => listeners.delete(f); }
export async function promptInstall() {
  const e = deferredPrompt;
  if (!e) return false;
  deferredPrompt = null;
  e.prompt();
  const { outcome } = await e.userChoice;
  notify();
  return outcome === 'accepted';
}

// The device's IANA zone (e.g. 'Asia/Taipei'); used to send pushes at local time.
export function deviceTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Taipei'; } catch { return 'Asia/Taipei'; }
}
