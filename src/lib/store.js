// localStorage wrapper that never throws (private mode, blocked storage).
// Phase 2 moves the profile to Supabase; keep keys stable until then.
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
