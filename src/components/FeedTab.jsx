import { AUTHORS, FEED } from '../data/sample.js';
import { t } from '../i18n';

export const newCount = follows => FEED.filter(f => follows[f.a] && f.h < 24 && !f.upcoming).length;

export function FeedTab({ follows, filter, setFilter }) {
  const items = FEED.filter(f => follows[f.a] && (filter === 'all' || f.a === filter));
  const filters = [['all', t.feed.all], ...AUTHORS.map(a => [a.id, t.authors[a.id].name])];

  return (
    <section role="tabpanel">
      <h2 style="font-size:22px;margin-top:4px">{t.feed.title}</h2>
      <p class="why" style="margin:4px 0 10px">{t.feed.intro}</p>
      <div class="filters">
        {filters.map(([id, name]) => (
          <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{name}</button>
        ))}
      </div>
      <div class="stack">
        {items.map(f => {
          const a = t.authors[f.a];
          const url = AUTHORS.find(x => x.id === f.a).url;
          const isNew = f.h < 24 && !f.upcoming;
          return (
            <article key={f.title} class="card post">
              <div class="avatar">{a.short}</div>
              <div style="min-width:0">
                <div class="meta">
                  <b style="color:var(--ink)">{a.name}</b>
                  <span class={`tag ${isNew ? 'new' : ''}`}>{f.upcoming ? t.feed.upcoming : isNew ? t.feed.new : t.feed.kinds[f.kind]}</span>
                  <span>{f.when}</span>
                </div>
                <h3>{f.title}</h3>
                <div class="why" style="margin-bottom:6px">{a.where}</div>
                {f.upcoming
                  ? <span class="why">{t.feed.upcomingNote}</span>
                  : <a href={url} target="_blank" rel="noopener">{t.feed.watch}</a>}
              </div>
            </article>
          );
        })}
        <p class="note">{t.feed.footnote}</p>
      </div>
    </section>
  );
}
