import { GLYPH } from '../astro';
import { t } from '../i18n';
import { gz, animalName, dayMasterName } from './labels.js';
import { Pillars, WuxingRadar } from './Wuxing.jsx';

// One-time screen after the first save: the chart, 八字 五行 and what happens next.
export function Reveal({ profile: p, pushTime, onDone }) {
  const R = t.reveal, w = p.wuxing;
  const items = [[p.sun, p.sunUncertain ? 'sunApprox' : 'sun', R.sun, t.sunKeywords[p.sun]], [p.moon, p.moonUncertain ? 'moonApprox' : 'moon', R.moon, t.moonKeywords[p.moon]]];
  if (p.rising !== null) items.push([p.rising, 'rising', R.rising, t.risingKeywords[p.rising]]);
  return (
    <section>
      <div class="label mono">{R.label}</div>
      <h1 style="font-size:25px;font-weight:900;margin-top:2px">{R.title(t.signs[p.sun], animalName(p))}</h1>
      <p class="why" style="margin:4px 0 14px">{R.why}</p>
      <div class="sky" style="grid-template-columns:1fr">
        <div class="k label" style="color:var(--gold);opacity:1">{R.chart}</div>
        <div class="rv-list">
          {items.map(([s, body, what, kw]) => (
            <div key={body} class="rv-item"><div class="g">{GLYPH[s]}</div><div><b>{R.item(t.bodies[body], t.signs[s])}</b><span>{what}：{kw}</span></div></div>
          ))}
          {p.rising === null && <p class="why" style="color:var(--night-fg);opacity:.7;margin:0">{R.noRising}</p>}
        </div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="label" style="color:var(--cinnabar)">{R.wxLabel}</div>
        <h2 style="margin-top:2px">{R.wxTitle(gz(w.pillars[0]), animalName(p), dayMasterName(w))}</h2>
        <Pillars wuxing={w} />
        <WuxingRadar wuxing={w} />
        <p class="why" style="margin-top:10px">{R.wxNote(dayMasterName(w), t.dayMasterKeywords[w.dayMaster], t.wuxing[w.luckyElement], t.wuxingColors[w.luckyElement], t.wuxingItems[w.luckyElement])}</p>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="label">{R.nextLabel}</div>
        <p style="margin-top:4px">{R.next[0]}<b class="mono">{pushTime}</b>{R.next[1]}</p>
      </div>
      <button class="primary" type="button" style="margin-top:14px" onClick={onDone}>{R.go}</button>
    </section>
  );
}
