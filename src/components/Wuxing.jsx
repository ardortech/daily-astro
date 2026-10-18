import { t } from '../i18n';

const EL_VAR = ['var(--el-wood)', 'var(--el-fire)', 'var(--el-earth)', 'var(--el-metal)', 'var(--el-water)'];

// 年 月 日 時 pillars, 日主 (day stem) highlighted; ？ for the hour without a birth time.
export function Pillars({ wuxing, onCharTap }) {
  const Z = t.zodiac;
  const tap = onCharTap ? ch => () => onCharTap(ch) : null;
  return (
    <div class="pillars">
      {Z.pillarNames.map((n, i) => {
        const p = wuxing.pillars[i];
        return p
          ? <div key={n} class={i === 2 ? 'dm' : ''}><span class="pl">{Z.pillar(n)}</span><span class={`ch${tap ? ' tappable' : ''}`} onClick={tap?.(t.stems[p[0]])}>{t.stems[p[0]]}</span><span class={`ch${tap ? ' tappable' : ''}`} onClick={tap?.(t.branches[p[1]])}>{t.branches[p[1]]}</span></div>
          : <div key={n} class="empty"><span class="pl">{Z.pillar(n)}</span><span class="ch">{Z.unknown}</span><span class="ch">{Z.unknown}</span></div>;
      })}
    </div>
  );
}

// 五行 radar: a pentagon in 相生 order clockwise from the top (木 火 土 金 水), grid rings at each
// integer up to max(3, highest count). The 補運 element's label is brass with 補運 under it.
export function WuxingRadar({ wuxing }) {
  const Z = t.zodiac;
  const { counts, luckyElement } = wuxing;
  const cx = 150, cy = 128, R = 84, top = Math.max(3, ...counts);
  const pt = (i, r) => { const a = (-90 + i * 72) * Math.PI / 180; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const poly = rOf => counts.map((_, i) => pt(i, rOf(i)).join(',')).join(' ');
  return (
    <div class="wx">
      <svg viewBox="0 0 300 250" role="img" aria-label={Z.wxAria(counts.map((n, e) => t.wuxing[e] + n))}>
        {Array.from({ length: top }, (_, k) => (
          <polygon key={k} points={poly(() => R * (k + 1) / top)} style="fill:none;stroke:var(--line);stroke-width:1" />
        ))}
        {counts.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} style="stroke:var(--line);stroke-width:1" />; })}
        <polygon points={poly(i => R * counts[i] / top)} style="fill:var(--brass);fill-opacity:.22;stroke:var(--brass);stroke-width:2;stroke-linejoin:round" />
        {counts.map((n, i) => { const [x, y] = pt(i, R * n / top); return <circle key={i} cx={x} cy={y} r="5" style={`fill:${EL_VAR[i]};stroke:var(--surface);stroke-width:2`} />; })}
        {counts.map((n, e) => {
          const [x, y] = pt(e, R + 26), lucky = e === luckyElement;
          return (
            <g key={e}>
              <text x={x} y={y + 6} text-anchor="middle" style={`font-family:var(--f-display);font-weight:900;font-size:17px;fill:${lucky ? 'var(--brass)' : 'var(--ink)'}`}>
                {t.wuxing[e]}<tspan style="font-family:var(--f-mono);font-weight:400;font-size:13px;fill:var(--muted)"> {n}</tspan>
              </text>
              {lucky && <text x={x} y={y + 22} text-anchor="middle" style="font-size:11px;fill:var(--brass)">{Z.wxLucky}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
