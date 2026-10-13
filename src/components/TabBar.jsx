import { t } from '../i18n';

const ICONS = {
  today: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></svg>,
  feed: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9.5v5l4-2.5z" fill="currentColor" /></svg>,
  notify: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>,
};

export function TabBar({ tab, onSelect, badge }) {
  return (
    <div class="tabs">
      <nav role="tablist">
        {['today', 'feed', 'notify'].map(id => (
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
