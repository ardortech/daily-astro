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
  follows: { tang: true, mafalda: true, susan: true },
  prefs: { daily: true, pushTime: '07:30' },
};
