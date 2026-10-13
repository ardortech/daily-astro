import { useState } from 'preact/hooks';
import { CITIES, GLYPH, chartFor } from '../astro';
import { t } from '../i18n';

// Birth date / time / city → sun, moon, rising, recalculated live.
export function Onboarding({ initial, onSave }) {
  const [birth, setBirth] = useState(initial);
  const set = patch => setBirth(b => ({ ...b, ...patch }));
  const chart = chartFor(birth.date, birth.time, birth.city, birth.noTime);
  const O = t.onboard;

  return (
    <section>
      <h2 style="font-size:22px;margin-top:4px">{O.title}</h2>
      <p class="why" style="margin:4px 0 14px">{O.intro}</p>
      <div class="card form">
        <label for="bDate">{O.date}
          <input type="date" id="bDate" value={birth.date} max="2100-12-31" onInput={e => e.currentTarget.value && set({ date: e.currentTarget.value })} />
        </label>
        <div class="two">
          <label for="bTime">{O.time}
            <input type="time" id="bTime" value={birth.time} disabled={birth.noTime} onInput={e => e.currentTarget.value && set({ time: e.currentTarget.value })} />
          </label>
          <label for="bCity">{O.city}
            <select id="bCity" value={birth.city} onChange={e => set({ city: e.currentTarget.value })}>
              {CITIES.map(([id]) => <option key={id} value={id}>{t.cities[id]}</option>)}
            </select>
          </label>
        </div>
        <label style="display:flex;gap:8px;align-items:center;color:var(--ink)">
          <input type="checkbox" checked={birth.noTime} onChange={e => set({ noTime: e.currentTarget.checked })} /> {O.noTime}
        </label>
        <div class="result">
          {[['sun', chart.sun], ['moon', chart.moon], ['rising', chart.rising]].map(([k, v]) => (
            <div key={k}><div class="label">{t.bodies[k]}</div><div class="big">{v === null ? '—' : `${GLYPH[v]} ${t.signs[v]}`}</div></div>
          ))}
        </div>
        <button class="primary" type="button" onClick={() => onSave({ ...birth, ...chart })}>{O.save}</button>
      </div>
      <p class="sample">{O.sample}</p>
    </section>
  );
}
