// localStorage wrapper that never throws (private mode, blocked storage).
// Since Phase 2 this is the offline cache; Supabase is the source of truth (see sync.js).
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

export const K = {
  profile: 'astro.profile',
  follows: 'astro.follows',
  prefs: 'astro.prefs',
  // true while local changes haven't reached Supabase yet (offline, error, app closed mid-save)
  syncPending: 'astro.syncPending',
};

// Used until the user changes them (they aren't written to the cache before that).
export const DEFAULTS = {
  follows: { tang: true, mafalda: true, susan: true, taowen: true },
  prefs: { daily: true, zodiacDaily: true, pushTime: '07:30', pushEnabled: false, authorsPush: true },
};

// True when supabase-js has a stored session (its `sb-<project>-auth-token` key), i.e. this
// device may already have a profile on the server even if the profile cache is gone.
export function hasStoredSession() {
  try { return Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token')); } catch { return false; }
}
