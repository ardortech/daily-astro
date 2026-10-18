import { useState, useEffect } from 'preact/hooks';
import { cityById } from '../astro';
import { AUTHORS } from '../data/sample.js';
import { t } from '../i18n';
import { animalName, dayMasterName } from './labels.js';
import { Switch } from './Switch.jsx';
import { isStandalone } from '../lib/platform.js';
import { canPush, needsHomeScreen, getPermission, subscribePush, unsubscribePush, sendTestPush, syncSubscription } from '../lib/push.js';

export function pushPreview(p, day, prefs) {
  const S = t.settings, r = day.reading, z = day.zodiac;
  const lines = [];
  if (prefs.daily) lines.push(S.previewAstro(t.houses[r.house][0], t.luckyColors[r.el][r.color]));
  if (prefs.zodiacDaily) lines.push(S.previewZodiac(t.relations[z.rel][0], day.alm.yi[0] || '', t.wuxingColors[p.wuxing.luckyElement]));
  return { title: S.previewTitle(t.signs[p.sun], animalName(p)), body: lines.join(' ') || S.previewOff };
}

const TIMES = [];
for (let h = 6; h <= 10; h++) for (let m = 0; m < 60; m += 15) TIMES.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

export function SettingsTab({ profile: p, day, prefs, setPrefs, follows, setFollow, onEdit, onShowGuide, toast }) {
  const S = t.settings;
  const pv = pushPreview(p, day, prefs);
  const [pushState, setPushState] = useState('loading');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    checkPushState();
  }, []);

  async function checkPushState() {
    if (needsHomeScreen()) { setPushState('needs-install'); return; }
    if (!canPush()) { setPushState('unsupported'); return; }
    const perm = await getPermission();
    setPushState(perm === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'default');
  }

  async function handleEnable() {
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
      console.warn('push subscribe failed', err);
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

  return (
    <section role="tabpanel">
      <h2 style="font-size:22px;margin-top:4px">{S.title}</h2>
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
        </div>

        <div class="card">
          <div class="label" style="margin-bottom:4px">{S.following}</div>
          {AUTHORS.map(({ id }) => {
            const a = t.authors[id];
            return (
              <div class="row" key={id}>
                <div><b>{a.name}</b><div class="why">{a.where}・{a.cadence}</div></div>
                <Switch checked={!!follows[id]} ariaLabel={S.followAria(a.name)} onChange={v => { setFollow(id, v); toast(v ? S.followed : S.unfollowed); }} />
              </div>
            );
          })}
        </div>

        <p class="note">{S.note}</p>
      </div>
    </section>
  );
}
