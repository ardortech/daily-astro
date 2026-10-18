import { useState } from 'preact/hooks';
import { GLYPH } from '../astro';
import { t } from '../i18n';
import { gz, animalName, dayMasterName } from './labels.js';
import { Pillars, WuxingRadar } from './Wuxing.jsx';
import { ZodiacImg } from './ZodiacImg.jsx';
import { canPush, needsHomeScreen, subscribePush } from '../lib/push.js';

export function Reveal({ profile: p, pushTime, onDone, toast }) {
  const R = t.reveal, w = p.wuxing;
  const [pushState, setPushState] = useState(needsHomeScreen() ? 'needs-install' : canPush() ? 'ready' : 'unsupported');
  const items = [[p.sun, p.sunUncertain ? 'sunApprox' : 'sun', R.sun, t.sunKeywords[p.sun]], [p.moon, p.moonUncertain ? 'moonApprox' : 'moon', R.moon, t.moonKeywords[p.moon]]];
  if (p.rising !== null) items.push([p.rising, 'rising', R.rising, t.risingKeywords[p.rising]]);

  async function handlePush() {
    try {
      const { supabase } = await import('../lib/supabase.js');
      if (!supabase) { onDone(); return; }
      const result = await subscribePush(supabase);
      if (result.permission === 'granted') {
        setPushState('granted');
        toast?.(t.push.enabled);
      } else if (result.permission === 'denied') {
        setPushState('denied');
      }
    } catch {
      setPushState('error');
    }
  }

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
        <div class="ztitle"><ZodiacImg branch={p.zodiac} size={56} color="var(--cinnabar)" /><h2 style="margin:2px 0 0">{R.wxTitle(gz(w.pillars[0]), animalName(p), dayMasterName(w))}</h2></div>
        <Pillars wuxing={w} />
        <WuxingRadar wuxing={w} />
        <p class="why" style="margin-top:10px">{R.wxNote(dayMasterName(w), t.dayMasterKeywords[w.dayMaster], t.wuxing[w.luckyElement], t.wuxingColors[w.luckyElement], t.wuxingItems[w.luckyElement])}</p>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="label">{R.nextLabel}</div>
        <p style="margin-top:4px">{R.next[0]}<b class="mono">{pushTime}</b>{R.next[1]}</p>
        {pushState === 'ready' && (
          <button class="primary" type="button" style="margin-top:10px" onClick={handlePush}>{t.push.enableBtn}</button>
        )}
        {pushState === 'granted' && (
          <p class="why" style="margin-top:8px;color:var(--good)">{t.push.enabled}</p>
        )}
        {pushState === 'needs-install' && (
          <p class="why" style="margin-top:8px">{t.push.needsInstall}</p>
        )}
        {pushState === 'denied' && (
          <p class="why" style="margin-top:8px">{t.push.deniedHint}</p>
        )}
      </div>
      <button class="primary" type="button" style="margin-top:14px" onClick={onDone}>{R.go}</button>
    </section>
  );
}
