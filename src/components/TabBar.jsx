import { t } from '../i18n';

// Icons from design/prototype.html.
const ICONS = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1z" /></svg>,
  astro: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M15.5 8.5a5 5 0 1 0 0 7 4 4 0 1 1 0-7z" fill="currentColor" /></svg>,
  zodiac: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 12h8M12 12v6M9 15.5h6" /></svg>,
  feed: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9.5v5l4-2.5z" fill="currentColor" /></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></svg>,
};

export const TABS = ['home', 'astro', 'zodiac', 'feed', 'settings'];

export function TabBar({ tab, onSelect, badge }) {
  return (
    <div class="tabs">
      <nav role="tablist">
        {TABS.map(id => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => onSelect(id)}>
            {ICONS[id]}
            {id === 'feed'
              ? <span>{t.tabs.feed}{badge ? <span class="badge">{badge}</span> : null}</span>
              : t.tabs[id]}
          </button>
        ))}
      </nav>
    </div>
  );
}
