import { GLYPH, phaseIndex, COLOR_HEX } from '../astro';
import { FEED } from '../data/sample.js';
import { t } from '../i18n';
import { Stars } from './Stars.jsx';
import { Wheel } from './Wheel.jsx';

const g = s => GLYPH[s] + '︎';

// 星座: the Moon's transit through the personal chart.
export function AstroTab({ profile, day, follows }) {
  const A = t.astro, S = t.signs, r = day.reading, sky = day.sky;
  const [theme, advice] = t.houses[r.house];
  const [aspName, aspText] = t.aspects[r.aspect];
  const mini = FEED.filter(f => follows[f.a] && !f.upcoming).slice(0, 3);

  return (
    <section role="tabpanel">
      <div class="sky">
        <div>
          <div class="date">{t.date(day.now)}</div>
          <h1>{A.headline(S[profile.sun], theme)}</h1>
          <div class="trio">
            <span>{profile.sunUncertain ? t.bodies.sunApprox : t.bodies.sun} <b>{g(profile.sun)} {S[profile.sun]}</b></span>
            <span>{profile.moonUncertain ? t.bodies.moonApprox : t.bodies.moon} <b>{g(profile.moon)} {S[profile.moon]}</b></span>
            {profile.rising !== null
              ? <span>{t.bodies.rising} <b>{g(profile.rising)} {S[profile.rising]}</b></span>
              : <span>{A.risingUnknown}</span>}
          </div>
        </div>
        <Wheel sky={sky} profile={profile} />
        <div class="moonline">
          {A.moonLine.pre}<b>{A.moonLine.sign(S[sky.moon])}</b>（<span class="mono">{(sky.mLon % 30).toFixed(0)}°</span>）・{t.phases[phaseIndex(sky.phase)]}{A.moonLine.house}<span class="mono">{r.house + 1}</span>{A.moonLine.houseSuffix}
        </div>
      </div>

      <div class="stack">
        <div class="card">
          <div class="label">{A.keyLabel}</div>
          <h2>{A.keyTitle(r.house + 1, theme)}</h2>
          <p>{advice}</p>
          <div class="scores">
            {r.scores.map((v, i) => (
              <div key={i}><span class="label">{t.scoreLabels[i]}</span><Stars label={t.scoreLabels[i]} value={v} /></div>
            ))}
          </div>
        </div>

        <div class="card watch">
          <div class="label">{A.watchLabel}</div>
          <p>{A.watchBody(aspName, aspText)}</p>
        </div>

        <div class="lucky">
          <div class="card">
            <div class="label">{A.luckyColorLabel}</div>
            <div class="swatch" style={{ background: COLOR_HEX[r.el][r.color] }} />
            <div class="big">{t.luckyColors[r.el][r.color]}</div>
            <div class="why">{A.luckyColorWhy(t.elements[r.el])}</div>
          </div>
          <div class="card">
            <div class="label">{A.luckyItemLabel}</div>
            <div class="big">{t.luckyItems[r.itemEl][r.item]}</div>
            <div class="why">{A.luckyItemWhy(profile.rising !== null, S[r.base])}</div>
          </div>
        </div>

        <div class="card">
          <div class="label">{A.miniFeedLabel}</div>
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
            }) : <p class="why">{A.miniFeedEmpty}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
