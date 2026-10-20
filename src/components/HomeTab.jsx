import { WUXING_HEX, COLOR_HEX } from '../astro';
import { t } from '../i18n';
import { animalName } from './labels.js';
import { Stars } from './Stars.jsx';
import { ZodiacImg } from './ZodiacImg.jsx';
import { AskEntry } from './AskTab.jsx';

export function HomeTab({ profile: p, day, follows, go, feedPosts, feedReadIds }) {
  const H = t.home, r = day.reading, z = day.zodiac, a = day.alm;
  const [theme, advice] = t.houses[r.house];
  const [relName] = t.relations[z.rel];
  const yi = a.yi, ji = a.ji;
  const lucky = p.wuxing.luckyElement;
  const next = a.goodHours.find(h => h >= day.hour) ?? a.goodHours[0];

  // Find the newest unread post from a followed author
  const latest = (feedPosts || []).find(p => follows[p.author_id] && !(feedReadIds || new Set()).has(p.id));

  const yiji = (
    <div class="yiji">
      <div><span class="seal yi">{t.yi}</span>{yi.slice(0, 2).join('・')}</div>
      <div><span class="seal ji">{t.ji}</span>{ji.slice(0, 2).join('・')}</div>
    </div>
  );

  return (
    <section role="tabpanel" class="home">
      <div class="label mono">{t.date(day.now)} ・ <span style="white-space:nowrap">{t.lunarDate(a.lunar)}</span></div>
      <h1>{H.greeting}</h1>
      <div class="sub">
        <div class="quote"><b>{H.combined(theme, relName)}</b>：{t.homeAdvice[r.scores[0] >= 4][z.tone]}</div>
      </div>
      <div class="duo">
        <button class="sum night" type="button" onClick={() => go('astro')}>
          <div class="k">{H.astroLabel}</div>
          <div class="big"><b>{theme}</b></div>
          <Stars label={t.scoreLabels[0]} value={r.scores[0]} />
          <div class="line">{t.aspects[r.aspect][0]}・{advice.split('，')[0]}</div>
          <div class="more">{H.astroMore}</div>
        </button>
        <button class="sum zcard" type="button" onClick={() => go('zodiac')}>
          <div class="k">{H.zodiacLabel}</div>
          <div class="ztitle"><ZodiacImg branch={p.zodiac} size={42} color="var(--cinnabar)" /><div class="big">{animalName(p)}・<b>{relName}</b></div></div>
          <Stars label={t.scoreLabels[0]} value={z.scores[0]} />
          {yiji}
          <div class="more" style="color:var(--cinnabar)">{H.zodiacMore}</div>
        </button>
      </div>
      <AskEntry go={go} />
      <div class="trio-lucky">
        <div class="lk">
          <div class="label">{H.luckyColor}</div>
          <div class="sw-row">
            <div class="sw" style={{ background: COLOR_HEX[r.el][r.color] }} />
            <div class="sw small" style={{ background: WUXING_HEX[lucky] }} title={H.wuxingSwatch} />
          </div>
          <div class="val">{t.luckyColors[r.el][r.color]}</div>
          <div class="why">{H.luckyColorWhy(t.wuxingColors[lucky], t.wuxing[lucky])}</div>
        </div>
        <div class="lk">
          <div class="label">{H.luckyItem}</div>
          <div class="val">{t.luckyItems[r.itemEl][r.item]}</div>
          <div class="why">{H.luckyItemWhy(t.wuxingItems[lucky])}</div>
        </div>
        <div class="lk">
          <div class="label">{H.cai}</div>
          <div class="val">{t.directions[a.cai]}</div>
          <div class="why">{H.caiWhy}</div>
        </div>
      </div>
      {day.personal && (
        <div class="card" style="margin-top:10px;padding:8px 18px">
          <div class="today-row"><span class="label">{H.tenGodLabel}</span><span><b>{t.tenGods[day.personal.tenGod]}</b> {t.tenGodHints[day.personal.tenGod]}</span></div>
          {day.personal.moonLinks.length > 0 && (
            <div class="today-row"><span class="label">{H.moonNatal}</span><span>{day.personal.moonLinks.map(l => `${t.bodies[l.body === 'moon' ? 'moon' : 'rising']}${t.aspects[l.aspect][0]}`).join('、')}</span></div>
          )}
        </div>
      )}
      <div class="card" style="margin-top:10px;padding:6px 18px">
        <div class="today-row"><span class="label">{H.todayYi}</span><span>{yi.join('・')}</span><span /></div>
        <div class="today-row"><span class="label">{H.nextHour}</span><span>{t.hourRange(next)}</span><span /></div>
        {latest && (
          <div class="today-row">
            <span class="label">{H.author}</span>
            <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{latest.title}</span>
            <a href="#" onClick={e => { e.preventDefault(); go('feed'); }}>{H.authorGo}</a>
          </div>
        )}
      </div>
    </section>
  );
}
