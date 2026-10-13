// Profile + follows sync with Supabase. localStorage (store.js) holds the latest
// local state and doubles as the offline cache; this module mirrors it to the
// `profiles` and `follows` tables.
//
//   sync('push')  after a local change: write the cached state to Supabase.
//   sync('auto')  at launch / back online: push if a change is still pending,
//                 otherwise pull the server copy (or upload the cache if the
//                 server has none yet, e.g. a profile saved before Phase 2).
//
// Runs are serialized so a pull can never overtake a pending write.
import { store, K, DEFAULTS } from './store.js';
import { deviceTimeZone } from './platform.js';
import { AUTHORS } from '../data/sample.js';

const AUTHOR_IDS = AUTHORS.map(a => a.id);
let chain = Promise.resolve();

export function sync(mode, onRemote) {
  if (mode === 'push') store.set(K.syncPending, true);
  chain = chain.then(() => run(mode, onRemote)).catch(err => console.warn('sync failed', err));
  return chain;
}

async function run(mode, onRemote) {
  const { supabase, ensureUser } = await import('./supabase.js');
  if (!supabase) return;
  const { id } = await ensureUser();
  if (mode === 'push' || store.get(K.syncPending, false)) return push(supabase, id);
  const remote = await pull(supabase, id);
  // A local change made while we were pulling wins; its own push is queued behind us.
  if (store.get(K.syncPending, false)) return;
  if (remote) onRemote?.(remote);
  else if (store.get(K.profile, null)) await push(supabase, id);
}

async function push(supabase, userId) {
  const profile = store.get(K.profile, null);
  // Nothing to save before onboarding; follows are written together with the profile.
  if (!profile) return store.set(K.syncPending, false);
  const prefs = store.get(K.prefs, DEFAULTS.prefs);
  const follows = store.get(K.follows, DEFAULTS.follows);
  const ok = ({ error }) => { if (error) throw error; };

  ok(await supabase.from('profiles').upsert(toRow(userId, profile, prefs.pushTime)));
  const on = AUTHOR_IDS.filter(a => follows[a]);
  const off = AUTHOR_IDS.filter(a => !follows[a]);
  if (on.length) ok(await supabase.from('follows').upsert(on.map(author_id => ({ user_id: userId, author_id })), { ignoreDuplicates: true }));
  if (off.length) ok(await supabase.from('follows').delete().eq('user_id', userId).in('author_id', off));
  store.set(K.syncPending, false);
}

async function pull(supabase, userId) {
  const [p, f] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('follows').select('author_id').eq('user_id', userId),
  ]);
  if (p.error) throw p.error;
  if (f.error) throw f.error;
  if (!p.data) return null;
  const followed = new Set(f.data.map(r => r.author_id));
  return {
    profile: fromRow(p.data),
    pushTime: p.data.push_time.slice(0, 5),
    follows: Object.fromEntries(AUTHOR_IDS.map(a => [a, followed.has(a)])),
  };
}

// App profile { date, time, city, noTime, sun, moon, moonUncertain, rising } ⇄ profiles row.
// Without a birth time only sun + moon are stored.
export function toRow(userId, p, pushTime) {
  return {
    user_id: userId,
    birth_date: p.date,
    birth_time: p.noTime ? null : p.time,
    city_id: p.city,
    sun: p.sun,
    moon: p.moon,
    moon_uncertain: !!p.moonUncertain,
    rising: p.noTime ? null : p.rising,
    push_time: pushTime || '07:30',
    time_zone: deviceTimeZone(),
  };
}

export function fromRow(r) {
  const noTime = r.birth_time === null;
  return {
    date: r.birth_date,
    time: noTime ? '12:00' : r.birth_time.slice(0, 5),
    city: r.city_id,
    noTime,
    sun: r.sun,
    moon: r.moon,
    moonUncertain: r.moon_uncertain,
    rising: noTime ? null : r.rising,
  };
}
