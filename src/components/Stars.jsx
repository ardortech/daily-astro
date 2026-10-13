import { t } from '../i18n';

// 1–5 stars, e.g. ★★★☆☆ (unlit stars are the same glyph in a muted colour).
export function Stars({ label, value }) {
  return (
    <div class="stars" role="img" aria-label={t.starsAria(label, value)}>
      {'★'.repeat(value)}<span class="off">{'★'.repeat(5 - value)}</span>
    </div>
  );
}
