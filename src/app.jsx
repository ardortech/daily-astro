import { useMemo, useRef, useState } from 'preact/hooks';
import { reading, sky as skyNow } from './astro';
import { SAMPLE_BIRTH } from './data/sample.js';
import { store } from './lib/store.js';
import { t } from './i18n';
import { TodayTab } from './components/TodayTab.jsx';
import { FeedTab, newCount } from './components/FeedTab.jsx';
import { NotifyTab } from './components/NotifyTab.jsx';
import { Onboarding } from './components/Onboarding.jsx';
import { TabBar } from './components/TabBar.jsx';
import { Toast } from './components/Toast.jsx';
import { InstallGuide } from './components/InstallGuide.jsx';

// Storage keys (Phase 2 moves profile + prefs to Supabase).
const K = { profile: 'astro.profile', follows: 'astro.follows', prefs: 'astro.prefs' };

export function App() {
  // profile = birth inputs + computed { sun, moon, rising }; null until onboarding is saved.
  const [profile, setProfile] = useState(() => store.get(K.profile, null));
  const [tab, setTab] = useState(profile ? 'today' : 'onboard');
  const [follows, setFollows] = useState(() => store.get(K.follows, { tang: true, mafalda: true, susan: true }));
  const [prefs, setPrefsState] = useState(() => store.get(K.prefs, { daily: true, pushTime: '07:30' }));
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
  const setPrefs = p => { setPrefsState(p); store.set(K.prefs, p); };
  const setFollow = (id, v) => { const f = { ...follows, [id]: v }; setFollows(f); store.set(K.follows, f); };
  const saveProfile = p => {
    setProfile(p); store.set(K.profile, p);
    setTab('today'); window.scrollTo(0, 0); toast(t.onboard.saved);
  };

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
