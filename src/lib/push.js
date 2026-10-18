// Push subscription management (Phase 4).
// Subscribe / unsubscribe from the browser, sync with Supabase via the API.
import { isStandalone, isIOS, deviceTimeZone } from './platform.js';

const VAPID_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();

function urlBase64ToUint8Array(base64String) {
  const s = base64String.trim();
  const padding = '='.repeat((4 - s.length % 4) % 4);
  const base64 = (s + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function canPush() {
  return 'PushManager' in self && 'serviceWorker' in navigator && !!VAPID_KEY;
}

export function needsHomeScreen() {
  return isIOS() && !isStandalone();
}

export async function getPermission() {
  if (!canPush()) return 'unsupported';
  return Notification.permission;
}

// Exposed so the diagnostics panel can read it.
export let lastPushError = null;

export async function subscribePush(supabase) {
  lastPushError = null;
  let step = 'init';
  try {
    step = 'vapid-key-check';
    if (!VAPID_KEY) throw new Error('VITE_VAPID_PUBLIC_KEY is missing');
    const appServerKey = urlBase64ToUint8Array(VAPID_KEY);

    step = 'sw-ready';
    const reg = await navigator.serviceWorker.ready;

    step = 'permission';
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { permission };

    step = 'subscribe';
    let sub;
    try {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appServerKey });
    } catch (subErr) {
      // If the existing subscription uses a different VAPID key, unsubscribe and retry.
      if (subErr.name === 'InvalidStateError' || /applicationServerKey/i.test(subErr.message)) {
        const old = await reg.pushManager.getSubscription();
        if (old) await old.unsubscribe();
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appServerKey });
      } else {
        throw subErr;
      }
    }

    step = 'api-call';
    const keys = sub.toJSON().keys;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not signed in');

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        lang: document.documentElement.lang?.startsWith('en') ? 'en' : 'zh',
        user_agent: navigator.userAgent,
        time_zone: deviceTimeZone(),
      }),
    });
    if (!res.ok) {
      step = `api-${res.status}`;
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    return { permission: 'granted', subscription: sub };
  } catch (err) {
    lastPushError = { step, name: err.name, message: err.message };
    console.error(`[push] failed at ${step}:`, err);
    throw err;
  }
}

export async function unsubscribePush(supabase) {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
    }
    await sub.unsubscribe();
  }
}

export async function sendTestPush(supabase) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');
  const res = await fetch('/api/push/test', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function syncSubscription(supabase) {
  if (!canPush() || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const keys = sub.toJSON().keys;
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        lang: document.documentElement.lang?.startsWith('en') ? 'en' : 'zh',
        user_agent: navigator.userAgent,
        time_zone: deviceTimeZone(),
      }),
    }).catch(() => {});
  } catch { /* best effort */ }
}

export async function getDiagnostics() {
  const diag = {
    standalone: isStandalone(),
    notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'n/a',
    swState: 'n/a',
    swScope: 'n/a',
    swScriptURL: 'n/a',
    vapidKeyPresent: !!VAPID_KEY,
    vapidKeyLength: VAPID_KEY.length,
    vapidKeyPrefix: VAPID_KEY.slice(0, 6),
    existingSubscription: false,
    lastError: lastPushError,
  };
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (reg) {
      const sw = reg.active || reg.waiting || reg.installing;
      diag.swState = sw?.state || 'none';
      diag.swScope = reg.scope;
      diag.swScriptURL = sw?.scriptURL || 'n/a';
      const sub = await reg.pushManager?.getSubscription();
      diag.existingSubscription = !!sub;
    } else {
      diag.swState = 'no registration';
    }
  } catch (e) {
    diag.swState = `error: ${e.message}`;
  }
  return diag;
}
