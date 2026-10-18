// Push subscription management (Phase 4).
// Subscribe / unsubscribe from the browser, sync with Supabase via the API.
import { isStandalone, isIOS, deviceTimeZone } from './platform.js';

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
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

export async function subscribePush(supabase) {
  if (!canPush()) throw new Error('Push not supported');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { permission };

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
  });
  const keys = sub.toJSON().keys;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not signed in');

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
  });
  return { permission: 'granted', subscription: sub };
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
