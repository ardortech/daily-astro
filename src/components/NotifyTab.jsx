import { AUTHORS } from '../data/sample.js';
import { TENSE_ASPECTS } from '../astro';
import { t } from '../i18n';
import { Switch } from './Switch.jsx';

// Phase 1: UI only. Phase 4 wires 開啟通知 to Notification.requestPermission()
// + PushManager.subscribe() with the VAPID key, and saves time + time zone.
export function NotifyTab({ profile, reading: r, prefs, setPrefs, follows, setFollow, toast }) {
  const N = t.notify;
  return (
    <section role="tabpanel">
      <h2 style="font-size:22px;margin-top:4px">{N.title}</h2>
      <div class="stack">
        <div class="card">
          <div class="label" style="margin-bottom:8px">{N.previewLabel}</div>
          <div class="preview">
            <div class="ic">{N.previewIcon}</div>
            <div>
              <span class="t">{prefs.pushTime}</span>
              <b>{N.previewTitle(t.signs[profile.sun], t.houses[r.house][0])}</b>
              <span>{N.previewBody(t.luckyColors[r.el][r.color], t.luckyItems[r.itemEl][r.item], TENSE_ASPECTS.includes(r.aspect))}</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="row">
            <div><b>{N.daily}</b><div class="why">{N.dailyHint}</div></div>
            <Switch checked={prefs.daily} ariaLabel={N.daily} onChange={v => setPrefs({ ...prefs, daily: v })} />
          </div>
          <div class="row">
            <div style="flex:1"><b>{N.time}</b></div>
            <div style="width:130px">
              <input type="time" value={prefs.pushTime} aria-label={N.time} onInput={e => e.currentTarget.value && setPrefs({ ...prefs, pushTime: e.currentTarget.value })} />
            </div>
          </div>
        </div>

        <div class="card">
          <div class="label" style="margin-bottom:4px">{N.following}</div>
          {AUTHORS.map(({ id }) => {
            const a = t.authors[id];
            return (
              <div class="row" key={id}>
                <div><b>{a.name}</b><div class="why">{a.where}・{a.cadence}</div></div>
                <Switch checked={!!follows[id]} ariaLabel={N.followAria(a.name)} onChange={v => { setFollow(id, v); toast(v ? N.followed : N.unfollowed); }} />
              </div>
            );
          })}
        </div>

        <button class="primary" type="button" onClick={() => toast(N.demoToast(prefs.pushTime))}>{N.enable}</button>
        <p class="note">{N.note}</p>
      </div>
    </section>
  );
}
