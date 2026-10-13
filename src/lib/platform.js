export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}

// iPhone/iPod, plus iPadOS which reports itself as a Mac with touch.
export function isIOS() {
  const ua = navigator.userAgent;
  return /iPhone|iPod|iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Chrome/Firefox/Edge etc. on iOS identify themselves with these tokens.
export function isIOSSafari() {
  return isIOS() && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|Line\/|FBAN|FBAV|Instagram/.test(navigator.userAgent);
}

// The device's IANA zone (e.g. 'Asia/Taipei'); used to send pushes at local time.
export function deviceTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Taipei'; } catch { return 'Asia/Taipei'; }
}
