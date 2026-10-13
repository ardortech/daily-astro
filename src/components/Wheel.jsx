import { useEffect, useRef } from 'preact/hooks';
import { GLYPH } from '../astro';
import { D2R } from '../astro/math.js';
import { t } from '../i18n';

// Zodiac wheel with today's moon, ported from the prototype's drawWheel().
export function Wheel({ sky, profile }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; const g = cv.getContext('2d');
    const W = cv.width, c = W / 2, R = 96;
    g.clearRect(0, 0, W, W);
    g.strokeStyle = 'rgba(238,240,248,.35)'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(c, c, R - 30, 0, Math.PI * 2); g.stroke();
    const asc = profile.rising !== null ? profile.rising * 30 + 15 : profile.sun * 30;
    const pos = lon => (180 + (lon - asc)) * D2R; // ascendant on the left, signs run counter-clockwise
    for (let i = 0; i < 12; i++) {
      const a = pos(i * 30);
      g.beginPath(); g.moveTo(c + Math.cos(a) * (R - 30), c - Math.sin(a) * (R - 30)); g.lineTo(c + Math.cos(a) * R, c - Math.sin(a) * R); g.stroke();
      const m = pos(i * 30 + 15);
      g.fillStyle = (i === profile.sun || i === profile.moon || i === profile.rising) ? '#e3bc74' : 'rgba(238,240,248,.55)';
      g.font = '18px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(GLYPH[i], c + Math.cos(m) * (R - 15), c - Math.sin(m) * (R - 15));
    }
    const ma = pos(sky.mLon);
    g.fillStyle = '#eef0f8'; g.beginPath(); g.arc(c + Math.cos(ma) * (R - 48), c - Math.sin(ma) * (R - 48), 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(238,240,248,.6)'; g.font = '13px "IBM Plex Mono", monospace'; g.fillText(t.today.wheelCenter, c, c);
  }, [sky.mLon, profile.sun, profile.moon, profile.rising]);
  return <canvas ref={ref} class="wheel" width="208" height="208" aria-label={t.today.wheelLabel} />;
}
