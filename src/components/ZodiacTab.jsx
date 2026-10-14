import { STEM_EL, WUXING_HEX, luckyAnimals } from '../astro';
import { t } from '../i18n';
import { gz, animalName, dayMasterName } from './labels.js';
import { Stars } from './Stars.jsx';
import { Pillars, WuxingRadar } from './Wuxing.jsx';
import { ZodiacImg } from './ZodiacImg.jsx';

// 生肖: today's relation to the year branch, 補運 colour, 八字 五行 and the almanac.
export function ZodiacTab({ profile: p, day }) {
  const Z = t.zodiac, a = day.alm, z = day.zodiac, w = p.wuxing;
  const [relName, focus, watch] = t.relations[z.rel];
  const [yi, ji] = t.almanacYiJi[a.jianchu];
  const dayEl = t.wuxing[STEM_EL[a.day[0]]];
  const lucky = w.luckyElement;
  const me = animalName(p);

  return (
    <section role="tabpanel">
      <div class="sky">
        <div>
          <div class="date">{t.date(day.now)} ・ <span style="white-space:nowrap">{t.lunarDate(a.lunar)}</span></div>
          <h1>{Z.headline(me, relName)}</h1>
          <span class={`rel ${z.tone}`}>{Z.relBadge(gz(a.day), gz(w.pillars[0]), t.animals[p.zodiac])}</span>
        </div>
        <div class="animal">
          <ZodiacImg branch={p.zodiac} size={80} color="var(--gold)" />
          <small>{Z.heroLabel(t.animals[p.zodiac], me)}{p.zodiacUncertain ? `・${Z.approx}` : ''}</small>
        </div>
        <div class="moonline">
          {Z.line(gz(a.day), dayEl)}<b>{t.animals[a.chong]}</b>{Z.lineLucky(luckyAnimals(a.day[1]).map(u => t.animals[u]).join('、'))}{z.taisui !== null ? Z.lineTaisui(t.taisui[z.taisui]) : ''}
        </div>
      </div>

      <div class="stack">
        <div class="card">
          <div class="label">{Z.keyLabel}</div>
          <h2>{Z.keyTitle(relName, t.toneTitle[z.tone])}</h2>
          <p>{focus}{z.boost ? Z.boost(dayEl, t.wuxing[lucky]) : ''}</p>
          <div class="scores">
            {z.scores.map((v, i) => (
              <div key={i}><span class="label">{t.scoreLabels[i]}</span><Stars label={t.scoreLabels[i]} value={v} /></div>
            ))}
          </div>
        </div>

        <div class="card watch">
          <div class="label">{Z.watchLabel}</div>
          <p>{watch}</p>
        </div>

        <div class="lucky">
          <div class="card">
            <div class="label">{Z.colorLabel}</div>
            <div class="swatch" style={{ background: WUXING_HEX[lucky] }} />
            <div class="big">{t.wuxingColors[lucky]}</div>
            <div class="why">{Z.colorWhy(t.wuxing[lucky], t.wuxingColors[lucky], t.wuxingItems[lucky])}</div>
          </div>
          <div class="card">
            <div class="label">{Z.caiLabel}</div>
            <div class="big">{t.directions[a.cai]}</div>
            <div class="why">{Z.caiWhy(t.stems[a.day[0]], t.directions[a.cai])}</div>
          </div>
        </div>

        <div class="card">
          <div class="label">{Z.baziLabel}</div>
          <h2 style="margin-top:2px">{Z.baziTitle(dayMasterName(w), me)}</h2>
          <Pillars wuxing={w} />
          <WuxingRadar wuxing={w} />
          <p class="why" style="margin-top:10px">{Z.wxNote(t.wuxing[lucky], w.pillars.length < 4)}</p>
        </div>

        <div class="card almanac-card">
          <div class="head"><div class="label" style="color:var(--cinnabar)">{Z.almanacLabel}</div><div class="gz">{Z.gz(gz(a.year), gz(a.month), gz(a.day))}</div></div>
          <div class="yiji">
            <div><span class="seal yi">{t.yi}</span>{yi.join('・')}</div>
            <div><span class="seal ji">{t.ji}</span>{ji.join('・')}</div>
          </div>
          <div class="facts">
            <div><span class="label">{Z.duty}</span><b>{Z.dutyValue(t.jianchu[a.jianchu])}</b></div>
            <div><span class="label">{Z.chongSha}</span><b>{Z.chongShaValue(t.animals[a.chong], t.shaDirections[a.sha])}</b></div>
            <div><span class="label">{Z.cai}</span><b>{t.directions[a.cai]}</b></div>
          </div>
          <div style="margin-top:12px">
            <div class="label">{Z.hours}</div>
            <div class="hours">{a.goodHours.map(h => <span key={h} class={h === day.hour ? 'now' : ''}>{t.hourRange(h)}</span>)}</div>
          </div>
        </div>
        <p class="note">{Z.note}</p>
      </div>
    </section>
  );
}
