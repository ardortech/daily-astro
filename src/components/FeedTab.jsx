import { useEffect, useState } from 'preact/hooks';
import { t } from '../i18n';

export function useFeedData(follows) {
  const [authors, setAuthors] = useState([]);
  const [posts, setPosts] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { supabase, ensureUser } = await import('../lib/supabase.js');
        if (!supabase) { setLoading(false); return; }
        const { id } = await ensureUser();

        const [authorsRes, postsRes, readsRes] = await Promise.all([
          supabase.from('authors').select('id, name_zh, source_label, cadence, category, active').eq('active', true),
          supabase.from('author_posts')
            .select('id, author_id, url, title, published_at, kind')
            .order('published_at', { ascending: false })
            .limit(50),
          supabase.from('post_reads')
            .select('post_id')
            .eq('user_id', id),
        ]);
        if (cancelled) return;
        setAuthors(authorsRes.data || []);
        setPosts(postsRes.data || []);
        setReadIds(new Set((readsRes.data || []).map(r => r.post_id)));
      } catch (err) {
        console.warn('feed: load failed', err);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const markRead = async (postId) => {
    setReadIds(prev => new Set([...prev, postId]));
    try {
      const { supabase, ensureUser } = await import('../lib/supabase.js');
      if (!supabase) return;
      const { id } = await ensureUser();
      await supabase.from('post_reads').upsert({ user_id: id, post_id: postId }, { onConflict: 'user_id,post_id', ignoreDuplicates: true });
    } catch {}
  };

  return { authors, posts, readIds, loading, markRead };
}

export function newCount(follows, posts, readIds) {
  if (!posts?.length) return 0;
  return posts.filter(p => follows[p.author_id] && !readIds.has(p.id)).length;
}

export function FeedTab({ follows, filter, setFilter, posts, readIds, markRead, authors }) {
  const authorList = (authors || []).filter(a => a.active !== false);
  const authorIds = authorList.map(a => a.id);
  const items = (posts || []).filter(p => follows[p.author_id] && (filter === 'all' || p.author_id === filter));

  const filters = [['all', t.feed.all], ...authorIds.filter(id => follows[id]).map(id => {
    const a = t.authors[id];
    return a ? [id, a.name] : [id, id];
  })];

  const byAuthor = new Map();
  for (const p of items) {
    const list = byAuthor.get(p.author_id) || [];
    if (list.length < 3) list.push(p);
    byAuthor.set(p.author_id, list);
  }

  const handlePostClick = (post) => {
    markRead?.(post.id);
    window.open(post.url, '_blank', 'noopener');
  };

  const visibleAuthors = authorIds.filter(id =>
    follows[id] && (filter === 'all' || filter === id)
  );

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
        {visibleAuthors.length > 0 ? visibleAuthors.map(authorId => {
          const authorPosts = byAuthor.get(authorId);
          const a = t.authors[authorId];
          const authorRow = authorList.find(r => r.id === authorId);
          const cat = authorRow?.category;
          return (
            <div key={authorId} class="card" style="padding:12px 16px">
              <div class="meta" style="margin-bottom:8px">
                <div class="avatar">{a ? a.short : authorId[0]}</div>
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:6px">
                    <b style="color:var(--ink)">{a ? a.name : authorId}</b>
                    {cat && <span class="cat-tag">{t.categories[cat] || cat}</span>}
                  </div>
                  <div class="why">{a ? `${a.where}・${a.cadence}` : ''}</div>
                </div>
              </div>
              {authorPosts?.length ? authorPosts.map(p => {
                const isUnread = !readIds.has(p.id);
                return (
                  <div key={p.id} class="post-row" role="button" tabIndex={0} onClick={() => handlePostClick(p)} onKeyDown={e => e.key === 'Enter' && handlePostClick(p)}>
                    <div style="min-width:0;flex:1">
                      <span class={`tag ${isUnread ? 'new' : ''}`}>{isUnread ? t.feed.new : t.feed.kinds[p.kind] || p.kind}</span>
                      <span class="post-title">{p.title}</span>
                    </div>
                    <span class="post-date">{formatDate(p.published_at)}</span>
                  </div>
                );
              }) : (
                <p class="why" style="text-align:center;padding:8px 0">{t.feed.noPosts}</p>
              )}
            </div>
          );
        }) : (
          <p class="why" style="text-align:center;padding:24px 0">{t.feed.footnote}</p>
        )}
        <p class="note">{t.feed.copyright}</p>
      </div>
    </section>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now - d) / 3600000;
  if (diffH < 1) return '剛剛';
  if (diffH < 24) return `${Math.floor(diffH)} 小時前`;
  if (diffH < 48) return '昨天';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
