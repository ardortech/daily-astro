import { cityById } from '../astro';
import { AUTHORS } from '../data/sample.js';
import { t } from '../i18n';
import { animalName, dayMasterName } from './labels.js';
import { Switch } from './Switch.jsx';

// The daily push text: one 星座 line + one 生肖 line, following the two switches.
// Phase 3 swaps in the cached readings; Phase 4 sends it.
export function pushPreview(p, day, prefs) {
  const S = t.settings, r = day.reading, z = day.zodiac;
  const lines = [];
  if (prefs.daily) lines.push(S.previewAstro(t.houses[r.house][0], t.luckyColors[r.el][r.color]));
  if (prefs.zodiacDaily) lines.push(S.previewZodiac(t.relations[z.rel][0], t.almanacYiJi[day.alm.jianchu][0][0], t.wuxingColors[p.wuxing.luckyElement]));
  return { title: S.previewTitle(t.signs[p.sun], animalName(p)), body: lines.join(' ') || S.previewOff };
}

// 設定: saved birth details, push preview + switches, followed authors.
// Phase 4 wires 開啟通知 to Notification.requestPermission() + PushManager.subscribe().
export function SettingsTab({ profile: p, day, prefs, setPrefs, follows, setFollow, onEdit, toast }) {
  const S = t.settings;
  const pv = pushPreview(p, day, prefs);
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
        </div>

        <div class="card">
          <div class="label" style="margin-bottom:8px">{S.previewLabel}</div>
          <div class="preview">
            <div class="ic">{S.previewIcon}</div>
            <div><span class="t">{prefs.pushTime}</span><b>{pv.title}</b><span>{pv.body}</span></div>
          </div>
        </div>

        <div class="card">
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
              <input type="time" value={prefs.pushTime} aria-label={S.time} onInput={e => e.currentTarget.value && setPrefs({ ...prefs, pushTime: e.currentTarget.value })} />
            </div>
          </div>
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

        <button class="primary" type="button" onClick={() => toast(S.demoToast(prefs.pushTime))}>{S.enable}</button>
        <p class="note">{S.note}</p>
      </div>
    </section>
  );
}
