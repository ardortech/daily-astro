import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { profileFor, today } from './astro';
import { SAMPLE_BIRTH } from './data/sample.js';
import { store, K, DEFAULTS, hasStoredSession } from './lib/store.js';
import { sync } from './lib/sync.js';
import { t } from './i18n';
import { HomeTab } from './components/HomeTab.jsx';
import { AstroTab } from './components/AstroTab.jsx';
import { ZodiacTab } from './components/ZodiacTab.jsx';
import { FeedTab, useFeedData, newCount } from './components/FeedTab.jsx';
import { SettingsTab } from './components/SettingsTab.jsx';
import { BirthForm } from './components/BirthForm.jsx';
import { Reveal } from './components/Reveal.jsx';
import { TabBar, TABS } from './components/TabBar.jsx';
import { Toast } from './components/Toast.jsx';
import { InstallGuide, InstallWelcome, GuideContent, needsInstall, PreviewBadge } from './components/InstallGuide.jsx';
import { AskTab, AskEntry } from './components/AskTab.jsx';

// Recompute everything derived from the birth inputs, so caches and rows written by
// older versions (no 生肖 / 五行, older engines) pick up the current code.
const withProfile = b => b && profileFor({ calendar: 'solar', ...b });

export function App() {
  // profile = birth inputs + derived chart / 農曆 / 生肖 / 五行; null until the first save.
  // State starts from the localStorage cache; Supabase (lib/sync.js) is the source of truth.
  const [profile, setProfile] = useState(() => {
    const p = withProfile(store.get(K.profile, null));
    if (p) store.set(K.profile, p);
    return p;
  });
  // A tab, or 'reveal' (once, after the first save) / 'edit' (birth details from 設定).
  const [view, setView] = useState('home');
  // No cached profile but a Supabase session: wait for the first pull before showing the
  // welcome form, so a profile that exists on the server never gets asked for again.
  const [booting, setBooting] = useState(() => !profile && hasStoredSession());
  const [follows, setFollows] = useState(() => store.get(K.follows, DEFAULTS.follows));
  const [prefs, setPrefsState] = useState(() => ({ ...DEFAULTS.prefs, ...store.get(K.prefs, {}) }));
  const [filter, setFilter] = useState('all');
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef();

  const day = useMemo(() => today(profile), [view, profile]);

  const [askQ, setAskQ] = useState(null);
  const feed = useFeedData(follows);

  const toast = msg => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2200);
  };
  const show = (next, q) => { if (next === 'ask') setAskQ(q || null); setView(next); window.scrollTo(0, 0); };
  // pushTime → push_time, daily → daily_enabled, zodiacDaily → zodiac_daily_enabled.
  const setPrefs = p => {
    const changed = p.pushTime !== prefs.pushTime || p.daily !== prefs.daily || p.zodiacDaily !== prefs.zodiacDaily;
    setPrefsState(p); store.set(K.prefs, p);
    if (changed) sync('push');
  };
  const setFollow = (id, v) => { const f = { ...follows, [id]: v }; setFollows(f); store.set(K.follows, f); sync('push'); };
  const saveProfile = b => {
    const first = !profile;
    const p = withProfile(b);
    setProfile(p); store.set(K.profile, p); sync('push');
    if (first) show('reveal');
    else { show('settings'); toast(t.birth.updated); }
  };

  // Sign in (anonymously on first launch) and reconcile with Supabase; again whenever we come back online.
  useEffect(() => {
    const applyRemote = ({ profile: remote, prefs: remotePrefs, follows: f }) => {
      const p = withProfile(remote);
      setProfile(p); store.set(K.profile, p);
      setFollows(f); store.set(K.follows, f);
      const nextPrefs = { ...DEFAULTS.prefs, ...store.get(K.prefs, {}), ...remotePrefs };
      setPrefsState(nextPrefs); store.set(K.prefs, nextPrefs);
    };
    const auto = () => sync('auto', applyRemote);
    const done = () => setBooting(false);
    auto().finally(done);
    const timer = setTimeout(done, 5000); // offline or slow: don't hold the app hostage
    window.addEventListener('online', auto);
    // Re-sync push subscription on every app open (endpoints can change)
    import('./lib/push.js').then(({ syncSubscription }) =>
      import('./lib/supabase.js').then(({ supabase }) => supabase && syncSubscription(supabase)),
    ).catch(() => {});
    return () => { clearTimeout(timer); window.removeEventListener('online', auto); };
  }, []);

  const firstRun = !profile;
  const tabbed = !firstRun && TABS.includes(view);

  let body;
  if (booting && firstRun) body = <div class="boot" />;
  else if (firstRun) body = needsInstall()
    ? <InstallWelcome toast={toast} />
    : <><InstallGuide toast={toast} /><BirthForm first initial={SAMPLE_BIRTH} onSave={saveProfile} /></>;
  else if (view === 'reveal') body = <Reveal profile={profile} pushTime={prefs.pushTime} onDone={() => show('home')} toast={toast} />;
  else if (view === 'edit') body = <BirthForm initial={profile} onSave={saveProfile} />;
  else if (view === 'ask') body = <AskTab profile={profile} initialQ={askQ} onBack={() => show('home')} />;
  else if (view === 'install-guide') body = <section><div class="card" style="margin-top:14px"><h2>{t.install.title}</h2><GuideContent toast={toast} /><div style="margin-top:16px;text-align:center"><button class="chip-btn" type="button" onClick={() => show('settings')}>{t.app.back}</button></div></div></section>;
  else body = <>
    <InstallGuide toast={toast} />
    {view === 'home' && <HomeTab profile={profile} day={day} follows={follows} go={show} feedPosts={feed.posts} feedReadIds={feed.readIds} />}
    {view === 'astro' && <AstroTab profile={profile} day={day} follows={follows} feedPosts={feed.posts} feedReadIds={feed.readIds} />}
    {view === 'zodiac' && <ZodiacTab profile={profile} day={day} />}
    {view === 'feed' && <FeedTab follows={follows} filter={filter} setFilter={setFilter} posts={feed.posts} readIds={feed.readIds} markRead={feed.markRead} authors={feed.authors} />}
    {view === 'settings' && <SettingsTab profile={profile} day={day} prefs={prefs} setPrefs={setPrefs} follows={follows} setFollow={setFollow} onEdit={() => show('edit')} onShowGuide={() => show('install-guide')} toast={toast} feedPosts={feed.posts} feedReadIds={feed.readIds} feedAuthors={feed.authors} />}
  </>;

  return (
    <>
      <div class={`app${tabbed ? '' : ' first-run'}`}>
        <header class="top">
          <div class="brand"><img class="logo" src="/favicon.svg" alt="" width="30" height="30" /><span>{t.app.name}<small>{t.app.tagline}</small></span></div>
          {view === 'edit' && !firstRun && <button class="chip-btn" type="button" onClick={() => show('settings')}>{t.app.cancel}</button>}
          <PreviewBadge />
        </header>
        {body}
      </div>
      {tabbed && <TabBar tab={view} onSelect={show} badge={newCount(follows, feed.posts, feed.readIds)} />}
      <Toast msg={toastMsg} />
    </>
  );
}
