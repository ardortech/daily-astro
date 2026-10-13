import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { chartFor, reading, sky as skyNow } from './astro';
import { SAMPLE_BIRTH } from './data/sample.js';
import { store, K, DEFAULTS } from './lib/store.js';
import { sync } from './lib/sync.js';
import { t } from './i18n';
import { TodayTab } from './components/TodayTab.jsx';
import { FeedTab, newCount } from './components/FeedTab.jsx';
import { NotifyTab } from './components/NotifyTab.jsx';
import { Onboarding } from './components/Onboarding.jsx';
import { TabBar } from './components/TabBar.jsx';
import { Toast } from './components/Toast.jsx';
import { InstallGuide } from './components/InstallGuide.jsx';

// Recompute the chart from the birth inputs, so caches written by older versions
// (Phase 1 math, no moonUncertain) pick up the current engine.
const withChart = b => b && ({ ...b, ...chartFor(b.date, b.time, b.city, b.noTime) });

export function App() {
  // profile = birth inputs + computed { sun, moon, moonUncertain, rising }; null until onboarding is saved.
  // State starts from the localStorage cache; Supabase (lib/sync.js) is the source of truth.
  const [profile, setProfile] = useState(() => {
    const p = withChart(store.get(K.profile, null));
    if (p) store.set(K.profile, p);
    return p;
  });
  const [tab, setTab] = useState(profile ? 'today' : 'onboard');
  const [follows, setFollows] = useState(() => store.get(K.follows, DEFAULTS.follows));
  const [prefs, setPrefsState] = useState(() => store.get(K.prefs, DEFAULTS.prefs));
  const [filter, setFilter] = useState('all');
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef();

  const sky = useMemo(() => skyNow(), [tab]);
  const r = profile && reading(profile, sky);

  const toast = msg => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2200);
  };
  const show = next => { setTab(profile || next === 'onboard' ? next : 'onboard'); window.scrollTo(0, 0); };
  // Only push_time is stored server-side; `daily` stays on the device until Phase 4.
  const setPrefs = p => {
    const timeChanged = p.pushTime !== prefs.pushTime;
    setPrefsState(p); store.set(K.prefs, p);
    if (timeChanged) sync('push');
  };
  const setFollow = (id, v) => { const f = { ...follows, [id]: v }; setFollows(f); store.set(K.follows, f); sync('push'); };
  const saveProfile = p => {
    setProfile(p); store.set(K.profile, p); sync('push');
    setTab('today'); window.scrollTo(0, 0); toast(t.onboard.saved);
  };

  // Sign in (anonymously on first launch) and reconcile with Supabase; again whenever we come back online.
  useEffect(() => {
    const applyRemote = ({ profile: p, pushTime, follows: f }) => {
      const hadProfile = !!store.get(K.profile, null);
      setProfile(p); store.set(K.profile, p);
      setFollows(f); store.set(K.follows, f);
      const nextPrefs = { ...store.get(K.prefs, DEFAULTS.prefs), pushTime };
      setPrefsState(nextPrefs); store.set(K.prefs, nextPrefs);
      if (!hadProfile) setTab('today');
    };
    const auto = () => sync('auto', applyRemote);
    auto();
    window.addEventListener('online', auto);
    return () => window.removeEventListener('online', auto);
  }, []);

  return (
    <>
      <div class="app">
        <header class="top">
          <div class="brand">{t.app.name}<small>{t.app.nameLatin}</small></div>
          <button class="chip-btn" type="button" onClick={() => show('onboard')}>{t.app.myChart}</button>
        </header>
        <InstallGuide />

        {tab === 'onboard' && <Onboarding initial={profile ?? SAMPLE_BIRTH} onSave={saveProfile} />}
        {tab === 'today' && <TodayTab profile={profile} sky={sky} reading={r} follows={follows} />}
        {tab === 'feed' && <FeedTab follows={follows} filter={filter} setFilter={setFilter} />}
        {tab === 'notify' && <NotifyTab profile={profile} reading={r} prefs={prefs} setPrefs={setPrefs} follows={follows} setFollow={setFollow} toast={toast} />}

        <p class="sample">{t.app.sampleNote}</p>
      </div>
      <TabBar tab={tab} onSelect={show} badge={newCount(follows)} />
      <Toast msg={toastMsg} />
    </>
  );
}
