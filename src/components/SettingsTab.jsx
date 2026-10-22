import { useState, useEffect } from 'preact/hooks';
import { cityById } from '../astro';
import { t } from '../i18n';
import { animalName, dayMasterName } from './labels.js';
import { Switch } from './Switch.jsx';
import { isStandalone } from '../lib/platform.js';
import { canPush, needsHomeScreen, getPermission, subscribePush, unsubscribePush, sendTestPush, syncSubscription, getDiagnostics, lastPushError } from '../lib/push.js';
import { sync } from '../lib/sync.js';

export function pushPreview(p, day, prefs) {
  const S = t.settings, r = day.reading, z = day.zodiac;
  const lines = [];
  if (prefs.daily) lines.push(S.previewAstro(t.houses[r.house][0], t.luckyColors[r.el][r.color]));
  if (prefs.zodiacDaily) lines.push(S.previewZodiac(t.relations[z.rel][0], day.alm.yi[0] || '', t.wuxingColors[p.wuxing.luckyElement]));
  return { title: S.previewTitle(t.signs[p.sun], animalName(p)), body: lines.join(' ') || S.previewOff };
}

const TIMES = [];
for (let h = 6; h <= 10; h++) for (let m = 0; m < 60; m += 15) TIMES.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

export function SettingsTab({ profile: p, day, prefs, setPrefs, follows, setFollow, onEdit, onShowGuide, toast, feedAuthors }) {
  const S = t.settings;
  const pv = pushPreview(p, day, prefs);
  const [pushState, setPushState] = useState('loading');
  const [sending, setSending] = useState(false);
  const [pushError, setPushError] = useState(null);
  const [tapCount, setTapCount] = useState(0);
  const [showDiag, setShowDiag] = useState(false);
  const [diag, setDiag] = useState(null);
  const [swWaiting, setSwWaiting] = useState(false);

  useEffect(() => {
    checkPushState();
    checkSwUpdate();
  }, []);

  async function checkPushState() {
    if (needsHomeScreen()) { setPushState('needs-install'); return; }
    if (!canPush()) { setPushState('unsupported'); return; }
    const perm = await getPermission();
    setPushState(perm === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'default');
  }

  function checkSwUpdate() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistration('/').then(reg => {
      if (!reg) return;
      if (reg.waiting) { setSwWaiting(true); return; }
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) setSwWaiting(true);
        });
      });
    });
  }

  function handleSwUpdate() {
    navigator.serviceWorker.getRegistration('/').then(reg => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    });
  }

  async function handleEnable() {
    setPushError(null);
    try {
      const { supabase } = await import('../lib/supabase.js');
      if (!supabase) { toast(S.demoToast(prefs.pushTime)); return; }
      const result = await subscribePush(supabase);
      if (result.permission === 'granted') {
        setPushState('granted');
        setPrefs({ ...prefs, pushEnabled: true });
        toast(t.push.enabled);
      } else if (result.permission === 'denied') {
        setPushState('denied');
      }
    } catch (err) {
      const info = lastPushError || { step: '?', name: err.name, message: err.message };
      setPushError(`${info.step}: ${info.name} — ${info.message}`);
      toast(t.push.error);
    }
  }

  async function handleDisable() {
    try {
      const { supabase } = await import('../lib/supabase.js');
      if (supabase) await unsubscribePush(supabase);
      setPrefs({ ...prefs, pushEnabled: false });
      setPushState('default');
      toast(t.push.disabled);
    } catch (err) {
      console.warn('push unsubscribe failed', err);
    }
  }

  async function handleTest() {
    setSending(true);
    try {
      const { supabase } = await import('../lib/supabase.js');
      if (!supabase) { toast(S.demoToast(prefs.pushTime)); setSending(false); return; }
      await sendTestPush(supabase);
      toast(t.push.testSent);
    } catch (err) {
      toast(err.message?.includes('rate limit') ? t.push.testLimit : t.push.error);
    }
    setSending(false);
  }

  function handleNoteTap() {
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 5) {
      setTapCount(0);
      setShowDiag(true);
      getDiagnostics().then(setDiag).catch(() => {});
    }
  }

  const setAuthorsPush = v => {
    const next = { ...prefs, authorsPush: v };
    setPrefs(next);
    // Also sync to Supabase
    import('../lib/supabase.js').then(({ supabase, ensureUser }) => {
      if (!supabase) return;
      ensureUser().then(({ id }) => {
        supabase.from('profiles').update({ authors_push_enabled: v }).eq('user_id', id);
      });
    }).catch(() => {});
  };

  return (
    <section role="tabpanel">
      <h2 style="font-size:22px;margin-top:4px">{S.title}</h2>

      {swWaiting && (
        <button class="update-banner" type="button" onClick={handleSwUpdate}>
          {t.update.newVersion}
        </button>
      )}

      <div class="stack">
        <div class="card">
          <div class="label">{S.me}</div>
          <p style="margin-top:4px">
            <b>{p.date}</b>{S.meLunar(t.lunarDateFull(p.lunar))}・{p.noTime ? S.meTimeUnknown : p.time}・{t.cities[cityById(p.city).id]}
            <br />
            {t.sign(t.signs[p.sun])}・{t.bodies.moon}{t.signs[p.moon]}{p.rising !== null ? `・${t.bodies.rising}${t.signs[p.rising]}` : ''}・{animalName(p)}・{S.meDayMaster(dayMasterName(p.wuxing))}
          </p>
          <button class="chip-btn" type="button" style="margin-top:12px" onClick={onEdit}>{S.edit}</button>
          {!isStandalone() && onShowGuide && (
            <button class="chip-btn" type="button" style="margin-top:8px" onClick={onShowGuide}>{t.install.settingsLink}</button>
          )}
        </div>

        <div class="card">
          <div class="label" style="margin-bottom:8px">{S.previewLabel}</div>
          <div class="preview">
            <div class="ic">{S.previewIcon}</div>
            <div><span class="t">{prefs.pushTime}</span><b>{pv.title}</b><span>{pv.body}</span></div>
          </div>
        </div>

        <div class="card">
          <div class="label" style="margin-bottom:8px">{t.push.sectionTitle}</div>

          {pushState === 'granted' && (
            <>
              <div class="row" style="border-top:0">
                <div><b>{t.push.masterSwitch}</b></div>
                <Switch checked={true} ariaLabel={t.push.masterSwitch} onChange={() => handleDisable()} />
              </div>
              <div class="row">
                <div><b>{S.daily}</b><div class="why">{S.dailyHint}</div></div>
                <Switch checked={prefs.daily} ariaLabel={S.daily} onChange={v => setPrefs({ ...prefs, daily: v })} />
              </div>
              <div class="row">
                <div><b>{S.zodiacDaily}</b><div class="why">{S.zodiacDailyHint}</div></div>
                <Switch checked={prefs.zodiacDaily} ariaLabel={S.zodiacDaily} onChange={v => setPrefs({ ...prefs, zodiacDaily: v })} />
              </div>
              <div class="row">
                <div><b>{S.authorPush}</b><div class="why">{S.authorPushHint}</div></div>
                <Switch checked={prefs.authorsPush !== false} ariaLabel={S.authorPush} onChange={setAuthorsPush} />
              </div>
              <div class="row">
                <div style="flex:1"><b>{S.time}</b></div>
                <div style="width:130px">
                  <select value={prefs.pushTime} aria-label={S.time} onChange={e => e.currentTarget.value && setPrefs({ ...prefs, pushTime: e.currentTarget.value })}>
                    {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <button class="chip-btn" type="button" style="margin-top:10px;width:100%" onClick={handleTest} disabled={sending}>
                {sending ? t.push.testSending : t.push.testBtn}
              </button>
            </>
          )}

          {pushState === 'needs-install' && (
            <p class="why" style="margin-top:4px">{t.push.needsInstall}</p>
          )}

          {pushState === 'denied' && (
            <div style="margin-top:4px">
              <p class="why">{t.push.denied}</p>
              <p class="why" style="margin-top:6px">{t.push.deniedHint}</p>
            </div>
          )}

          {(pushState === 'default' || pushState === 'loading' || pushState === 'unsupported') && pushState !== 'needs-install' && pushState !== 'denied' && (
            <button class="primary" type="button" style="margin-top:8px" onClick={handleEnable} disabled={pushState === 'loading' || pushState === 'unsupported'}>
              {t.push.enableBtn}
            </button>
          )}

          {pushError && (
            <p class="push-error" style="margin-top:8px;font-size:11px;color:var(--muted);word-break:break-all">{pushError}</p>
          )}
        </div>

        <div class="card">
          <div class="label" style="margin-bottom:4px">{S.following}</div>
          {(feedAuthors || []).map(row => {
            const id = row.id;
            const a = t.authors[id] || { name: row.name_zh, where: row.source_label, cadence: row.cadence };
            return (
              <div class="row" key={id}>
                <div>
                  <div style="display:flex;align-items:center;gap:6px"><b>{a.name}</b>{row.category && <span class="cat-tag">{t.categories[row.category] || row.category}</span>}</div>
                  <div class="why">{a.where}・{a.cadence}</div>
                </div>
                <Switch checked={!!follows[id]} ariaLabel={S.followAria(a.name)} onChange={v => { setFollow(id, v); toast(v ? S.followed : S.unfollowed); }} />
              </div>
            );
          })}
        </div>

        <p class="note" onClick={handleNoteTap} style="cursor:default">{S.note}</p>

        <div class="version-info">
          {t.update.version(__APP_VERSION__)}
        </div>

        {showDiag && diag && (
          <div class="card" style="font-size:12px;font-family:var(--f-mono);word-break:break-all">
            <div class="label" style="margin-bottom:8px">Push Diagnostics</div>
            <div>standalone: <b>{String(diag.standalone)}</b></div>
            <div>Notification.permission: <b>{diag.notificationPermission}</b></div>
            <div>SW state: <b>{diag.swState}</b></div>
            <div>SW scope: <b>{diag.swScope}</b></div>
            <div>SW script: <b>{diag.swScriptURL}</b></div>
            <div>VAPID key: <b>{diag.vapidKeyPresent ? `yes (${diag.vapidKeyLength} chars, ${diag.vapidKeyPrefix}…)` : 'MISSING'}</b></div>
            <div>Existing sub: <b>{String(diag.existingSubscription)}</b></div>
            {diag.lastError && (
              <div style="margin-top:6px;color:var(--cinnabar)">
                Last error @ {diag.lastError.step}: {diag.lastError.name} — {diag.lastError.message}
              </div>
            )}
            <button class="chip-btn" type="button" style="margin-top:8px" onClick={() => setShowDiag(false)}>Close</button>
          </div>
        )}
      </div>
    </section>
  );
}
