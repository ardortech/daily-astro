import { t } from '../i18n';
import { zodiacImg } from '../lib/zodiac.js';

// One-colour paper-cut animal shown as a CSS mask, so it takes currentColor (theme-aware).
export function ZodiacImg({ branch, size, color }) {
  const style = `--zi:url(${zodiacImg(branch, size)});width:${size}px;height:${size}px${color ? `;color:${color}` : ''}`;
  return <span class="zimg" role="img" aria-label={t.animals[branch]} style={style} />;
}
