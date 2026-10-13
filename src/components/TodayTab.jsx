import { GLYPH, phaseIndex } from '../astro';
import { FEED } from '../data/sample.js';
import { t } from '../i18n';
import { Stars } from './Stars.jsx';
import { Wheel } from './Wheel.jsx';

const pad = n => String(n).padStart(2, '0');

export function TodayTab({ profile, sky, reading: r, follows }) {
  const d = sky.now;
  const S = t.signs;
  const [theme, advice] = t.houses[r.house];
  const [aspName, aspText] = t.aspects[r.aspect];
  const el = t.elements[r.el];
  const mini = FEED.filter(f => follows[f.a] && !f.upcoming).slice(0, 3);

  return (
    <section role="tabpanel">
      <div class="sky">
        <div>
          <div class="date">{`${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ・ ${t.weekdays[d.getDay()]}`}</div>
          <h1>{t.today.headline(S[profile.sun], theme)}</h1>
          <div class="trio">
            <span>{t.bodies.sun} <b>{GLYPH[profile.sun]} {S[profile.sun]}</b></span>
            <span>{t.bodies.moon} <b>{GLYPH[profile.moon]} {S[profile.moon]}</b></span>
            {profile.rising !== null
              ? <span>{t.bodies.rising} <b>{GLYPH[profile.rising]} {S[profile.rising]}</b></span>
              : <span>{t.today.risingUnknown}</span>}
          </div>
        </div>
        <Wheel sky={sky} profile={profile} />
        <div class="moonline">
          {t.today.moonLine.pre}<b>{t.today.moonLine.sign(S[sky.moon])}</b>（<span class="mono">{(sky.mLon % 30).toFixed(0)}°</span>）・{t.phases[phaseIndex(sky.phase)]}{t.today.moonLine.house}<span class="mono">{r.house + 1}</span>{t.today.moonLine.houseSuffix}
        </div>
      </div>

      <div class="stack">
        <div class="card">
          <div class="label">{t.today.keyLabel}</div>
          <h2>{t.today.keyTitle(r.house + 1, theme)}</h2>
          <p>{advice}</p>
          <div class="scores">
            {r.scores.map((v, i) => (
              <div key={i}><span class="label">{t.today.scoreLabels[i]}</span><Stars label={t.today.scoreLabels[i]} value={v} /></div>
            ))}
          </div>
        </div>

        <div class="card watch">
          <div class="label">{t.today.watchLabel}</div>
          <p>{t.today.watchBody(aspName, aspText)}</p>
        </div>

        <div class="lucky">
          <div class="card">
            <div class="label">{t.today.luckyColorLabel}</div>
            <div class="swatch" style={{ background: r.colorHex }} />
            <div class="big">{t.luckyColors[r.el][r.color]}</div>
            <div class="why">{t.today.luckyColorWhy(el)}</div>
          </div>
          <div class="card">
            <div class="label">{t.today.luckyItemLabel}</div>
            <div class="big">{t.luckyItems[r.itemEl][r.item]}</div>
            <div class="why">{t.today.luckyItemWhy(profile.rising !== null, S[r.base], t.elements[r.itemEl])}</div>
          </div>
        </div>

        <div class="card">
          <div class="label">{t.today.miniFeedLabel}</div>
          <div style="display:grid;gap:8px;margin-top:6px">
            {mini.length ? mini.map(f => {
              const a = t.authors[f.a];
              return (
                <div key={f.title} style="display:flex;gap:10px;align-items:center">
                  <div class="avatar" style="width:32px;height:32px;font-size:14px">{a.short}</div>
                  <div style="min-width:0;flex:1">
                    <div style="font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{f.title}</div>
                    <div class="why">{a.name}・{f.when}</div>
                  </div>
                </div>
              );
            }) : <p class="why">{t.today.miniFeedEmpty}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

