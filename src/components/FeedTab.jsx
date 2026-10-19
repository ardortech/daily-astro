import { useEffect, useState } from 'preact/hooks';
import { t } from '../i18n';

const AUTHORS_LIST = ['tang', 'mafalda', 'susan'];

export function useFeedData(follows) {
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

        const [postsRes, readsRes] = await Promise.all([
          supabase.from('author_posts')
            .select('id, author_id, url, title, published_at, kind')
            .in('author_id', AUTHORS_LIST)
            .order('published_at', { ascending: false })
            .limit(30),
          supabase.from('post_reads')
            .select('post_id')
            .eq('user_id', id),
        ]);
        if (cancelled) return;
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

  return { posts, readIds, loading, markRead };
}

export function newCount(follows, posts, readIds) {
  if (!posts?.length) return 0;
  return posts.filter(p => follows[p.author_id] && !readIds.has(p.id)).length;
}

export function FeedTab({ follows, filter, setFilter, posts, readIds, markRead }) {
  const items = (posts || []).filter(p => follows[p.author_id] && (filter === 'all' || p.author_id === filter));
  const filters = [['all', t.feed.all], ...AUTHORS_LIST.map(id => [id, t.authors[id].name])];

  // Group: latest 3 per author
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

  // If no Supabase data, show the static placeholder
  const hasPosts = items.length > 0;

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
        {hasPosts ? (
          AUTHORS_LIST.filter(id => filter === 'all' || filter === id).map(authorId => {
            const authorPosts = byAuthor.get(authorId);
            if (!authorPosts?.length) return null;
            if (!follows[authorId]) return null;
            const a = t.authors[authorId];
            return (
              <div key={authorId} class="card" style="padding:12px 16px">
                <div class="meta" style="margin-bottom:8px">
                  <div class="avatar">{a.short}</div>
                  <div>
                    <b style="color:var(--ink)">{a.name}</b>
                    <div class="why">{a.where}・{a.cadence}</div>
                  </div>
                </div>
                {authorPosts.map(p => {
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
                })}
              </div>
            );
          })
        ) : (
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
