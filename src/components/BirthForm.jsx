import { useState } from 'preact/hooks';
import { CITIES, REGIONS, GLYPH, profileFor, lunarMonths, lunarToSolar, solarToLunar } from '../astro';
import { t } from '../i18n';
import { animalName, dayMasterName } from './labels.js';

const now = new Date();
const THIS_YEAR = now.getFullYear();
const TODAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const LUNAR_YEARS = Array.from({ length: THIS_YEAR - 1930 + 1 }, (_, i) => THIS_YEAR - i);
const monthKey = m => `${m.month}${m.leap ? 'L' : ''}`;

// Keep the picked month/day valid when the year (or month) changes:
// a 閏月 that doesn't exist falls back to the regular month, day 30 to the last day.
function fitLunar(l) {
  const months = lunarMonths(l.year);
  const m = months.find(x => x.month === l.month && x.leap === l.leap) ?? months.find(x => x.month === l.month) ?? months[0];
  return { year: l.year, month: m.month, leap: m.leap, day: Math.min(l.day, m.days) };
}

// Birth date (國曆 or 農曆) / time / city → live preview of 太陽 月亮 上升 生肖 and 五行.
// first: the welcome form on first launch; otherwise editing from 設定 → 我的資料.
export function BirthForm({ initial, first, onSave }) {
  const [birth, setBirth] = useState({ calendar: 'solar', ...initial });
  const [lunar, setLunar] = useState(() => solarToLunar(initial.date));
  const set = patch => setBirth(b => ({ ...b, ...patch }));
  const B = t.birth;

  const isLunar = birth.calendar === 'lunar';
  const date = isLunar ? lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.leap) : birth.date;
  const p = date && profileFor({ ...birth, date });

  const setCalendar = calendar => {
    if (calendar === birth.calendar) return;
    if (calendar === 'lunar') setLunar(solarToLunar(birth.date));
    else if (date) set({ date });
    set({ calendar });
  };
  const months = lunarMonths(lunar.year);
  const month = months.find(x => x.month === lunar.month && x.leap === lunar.leap) ?? months[0];

  return (
    <section>
      <div class="card" style="margin-top:14px">
        <h2>{first ? B.welcome : B.editTitle}</h2>
        <p class="why" style="margin:2px 0 12px">{first ? B.welcomeIntro : B.editIntro}</p>
        <div class="form">
          <div class="seg" role="group" aria-label={B.calendarAria}>
            <button type="button" aria-pressed={!isLunar} onClick={() => setCalendar('solar')}>{B.solar}</button>
            <button type="button" aria-pressed={isLunar} onClick={() => setCalendar('lunar')}>{B.lunar}</button>
          </div>
          {isLunar ? (
            <div>
              <div class="label" style="margin-bottom:4px">{B.lunarDate}</div>
              <div class="three">
                <select aria-label={B.lunarYearAria} value={lunar.year} onChange={e => setLunar(fitLunar({ ...lunar, year: +e.currentTarget.value }))}>
                  {LUNAR_YEARS.map(y => { const i = ((y - 4) % 60 + 60) % 60; return <option key={y} value={y}>{B.lunarYear(y, t.stems[i % 10] + t.branches[i % 12])}</option>; })}
                </select>
                <select aria-label={B.lunarMonthAria} value={monthKey(month)} onChange={e => { const m = months.find(x => monthKey(x) === e.currentTarget.value); setLunar(fitLunar({ ...lunar, month: m.month, leap: m.leap })); }}>
                  {months.map(m => <option key={monthKey(m)} value={monthKey(m)}>{t.lunarMonth(m.month, m.leap)}</option>)}
                </select>
                <select aria-label={B.lunarDayAria} value={lunar.day} onChange={e => setLunar({ ...lunar, day: +e.currentTarget.value })}>
                  {Array.from({ length: month.days }, (_, i) => <option key={i} value={i + 1}>{t.lunarDay(i + 1)}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <label for="bDate">{B.solarDate}
              <input type="date" id="bDate" value={birth.date} min="1930-01-01" max={TODAY} onInput={e => e.currentTarget.value && set({ date: e.currentTarget.value })} />
            </label>
          )}
          <div class="conv">
            {!date ? B.invalidLunar
              : isLunar ? <>{B.toSolar}<b>{date}</b></>
              : <>{B.toLunar}<b>{t.lunarDateFull(p.lunar)}</b></>}
          </div>
          <div class="two">
            <label for="bTime">{B.time}
              <input type="time" id="bTime" value={birth.time} disabled={birth.noTime} onInput={e => e.currentTarget.value && set({ time: e.currentTarget.value })} />
            </label>
            <label for="bCity">{B.city}
              <select id="bCity" value={birth.city} onChange={e => set({ city: e.currentTarget.value })}>
                {REGIONS.map(r => (
                  <optgroup key={r} label={t.cityRegions[r]}>
                    {CITIES.filter(c => c.region === r).map(({ id }) => <option key={id} value={id}>{t.cities[id]}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
          <label style="display:flex;gap:8px;align-items:center;color:var(--ink)">
            <input type="checkbox" checked={birth.noTime} onChange={e => set({ noTime: e.currentTarget.checked })} /> {B.noTime}
          </label>
          {p && <>
            <div class="result">
              {[[p.sunUncertain ? 'sunApprox' : 'sun', p.sun], [p.moonUncertain ? 'moonApprox' : 'moon', p.moon], ['rising', p.rising]].map(([k, v]) => (
                <div key={k}><div class="label">{t.bodies[k]}</div><div class="big">{v === null ? '—' : GLYPH[v] + t.signs[v]}</div></div>
              ))}
              <div class="zod"><div class="label">{B.zodiac}</div><div class="big">{animalName(p)}{p.zodiacUncertain && <small>{B.approx}</small>}</div></div>
            </div>
            <div class="conv">
              {B.wx.dm}<b>{dayMasterName(p.wuxing)}</b>{B.wx.wx}{p.wuxing.counts.map((n, e) => `${t.wuxing[e]}${n}`).join(' ')}{B.wx.lucky}<b>{t.wuxing[p.wuxing.luckyElement]}</b>
            </div>
            {(p.sunUncertain || p.moonUncertain) && <p class="why">{B.approxNote(p.sunUncertain, p.moonUncertain)}</p>}
            {p.zodiacUncertain && <p class="why">{B.zodiacApproxNote}</p>}
          </>}
          <button class="primary" type="button" disabled={!p} onClick={() => onSave({ date, time: birth.time, city: birth.city, noTime: birth.noTime, calendar: birth.calendar })}>{first ? B.save : B.saveEdit}</button>
        </div>
      </div>
      {first && <p class="sample">{B.sample}</p>}
    </section>
  );
}
