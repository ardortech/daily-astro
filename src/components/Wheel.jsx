import { useEffect, useRef, useState } from 'preact/hooks';
import { GLYPH } from '../astro';
import { D2R } from '../astro/math.js';
import { t } from '../i18n';

const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Zodiac wheel with today's moon, ported from the prototype's drawWheel().
// Colours come from the theme tokens (--night-fg, --gold), redrawn when the theme flips.
export function Wheel({ sky, profile }) {
  const ref = useRef(null);
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const on = () => setDark(mq.matches);
    on(); mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  useEffect(() => {
    const cv = ref.current; const g = cv.getContext('2d');
    const W = cv.width, c = W / 2, R = 96;
    const fg = css('--night-fg'), gold = css('--gold');
    g.clearRect(0, 0, W, W);
    g.strokeStyle = fg; g.globalAlpha = .35; g.lineWidth = 1.5;
    g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(c, c, R - 30, 0, Math.PI * 2); g.stroke();
    const asc = profile.rising !== null ? profile.rising * 30 + 15 : profile.sun * 30;
    const pos = lon => (180 + (lon - asc)) * D2R; // ascendant on the left, signs run counter-clockwise
    for (let i = 0; i < 12; i++) {
      const a = pos(i * 30);
      g.globalAlpha = .35;
      g.beginPath(); g.moveTo(c + Math.cos(a) * (R - 30), c - Math.sin(a) * (R - 30)); g.lineTo(c + Math.cos(a) * R, c - Math.sin(a) * R); g.stroke();
      const m = pos(i * 30 + 15);
      const hi = i === profile.sun || i === profile.moon || i === profile.rising;
      g.globalAlpha = hi ? 1 : .55; g.fillStyle = hi ? gold : fg;
      g.font = '18px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(GLYPH[i] + '︎', c + Math.cos(m) * (R - 15), c - Math.sin(m) * (R - 15));
    }
    const ma = pos(sky.mLon);
    g.globalAlpha = 1; g.fillStyle = fg;
    g.beginPath(); g.arc(c + Math.cos(ma) * (R - 48), c - Math.sin(ma) * (R - 48), 9, 0, Math.PI * 2); g.fill();
  }, [sky.mLon, profile.sun, profile.moon, profile.rising, dark]);
  return <canvas ref={ref} class="wheel" width="208" height="208" aria-label={t.astro.wheelLabel} />;
}
