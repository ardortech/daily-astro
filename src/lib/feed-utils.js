import { t } from '../i18n/index.js';

export function groupPosts(posts, sun) {
  if (!posts?.length) return posts || [];
  const result = [];
  const mafaldaGroups = new Map();
  for (const p of posts) {
    if (p.author_id === 'mafalda') {
      const dateKey = p.published_at?.slice(0, 10) || '';
      const group = mafaldaGroups.get(dateKey) || [];
      group.push(p);
      mafaldaGroups.set(dateKey, group);
    } else {
      result.push(p);
    }
  }
  const signs = t.signs;
  for (const [, group] of mafaldaGroups) {
    const rangeMatch = group[0]?.title?.match(/(\d{1,2}\.\d{1,2})[～~\-–](\d{1,2}\.\d{1,2})/);
    const range = rangeMatch ? `${rangeMatch[1]}–${rangeMatch[2]}` : '';
    const signName = sun != null ? signs[sun] : null;
    const userArticle = signName ? group.find(p => p.title?.includes(signName)) : null;
    const fallback = group.find(p => p.title?.includes('牡羊')) || group[0];
    const target = userArticle || fallback;
    result.push({
      id: `mafalda-week-${group[0].published_at?.slice(0, 10)}`,
      author_id: 'mafalda',
      url: target.url,
      title: `瑪法達 ${t.feed.kinds.weekly} ${range}`,
      published_at: target.published_at,
      kind: 'weekly',
      _groupIds: group.map(p => p.id),
    });
  }
  return result.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
}

export function newCount(follows, posts, readIds) {
  if (!posts?.length) return 0;
  return posts.filter(p => {
    if (!follows[p.author_id]) return false;
    if (p._groupIds) return p._groupIds.some(id => !readIds.has(id));
    return !readIds.has(p.id);
  }).length;
}

export function cleanTitle(title, authorName) {
  if (!title || !authorName) return title;
  const doubled = authorName + authorName;
  if (title.startsWith(doubled)) return title.slice(authorName.length);
  return title;
}
