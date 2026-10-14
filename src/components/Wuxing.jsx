import { t } from '../i18n';

const EL_VAR = ['var(--el-wood)', 'var(--el-fire)', 'var(--el-earth)', 'var(--el-metal)', 'var(--el-water)'];

// 年 月 日 時 pillars, 日主 (day stem) highlighted; ？ for the hour without a birth time.
export function Pillars({ wuxing }) {
  const Z = t.zodiac;
  return (
    <div class="pillars">
      {Z.pillarNames.map((n, i) => {
        const p = wuxing.pillars[i];
        return p
          ? <div key={n} class={i === 2 ? 'dm' : ''}><span class="pl">{Z.pillar(n)}</span><span class="ch">{t.stems[p[0]]}</span><span class="ch">{t.branches[p[1]]}</span></div>
          : <div key={n} class="empty"><span class="pl">{Z.pillar(n)}</span><span class="ch">{Z.unknown}</span><span class="ch">{Z.unknown}</span></div>;
      })}
    </div>
  );
}

// 木 火 土 金 水 bars; the 補運 element is highlighted.
export function WuxingBars({ wuxing }) {
  const max = Math.max(...wuxing.counts, 1);
  return (
    <div class="wx">
      {wuxing.counts.map((n, e) => (
        <div key={e} class={`wx-row ${e === wuxing.luckyElement ? 'lucky-el' : ''}`}>
          <b>{t.wuxing[e]}</b>
          <div class="wx-bar"><i style={{ width: `${n / max * 100}%`, background: EL_VAR[e] }} /></div>
          <span class="mono">{n}</span>
        </div>
      ))}
    </div>
  );
}
