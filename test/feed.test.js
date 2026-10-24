import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupPosts, newCount, cleanTitle } from '../src/lib/feed-utils.js';

test('groupPosts collapses mafalda per-sign posts and picks user sign', () => {
  const posts = [
    { id: 1, author_id: 'mafalda', title: '瑪法達星座運勢／牡羊座 10.14～10.20', published_at: '2026-10-14T00:00:00.000Z', kind: 'weekly', url: 'https://example.com/aries' },
    { id: 2, author_id: 'mafalda', title: '瑪法達星座運勢／獅子座 10.14～10.20', published_at: '2026-10-14T00:00:00.000Z', kind: 'weekly', url: 'https://example.com/leo' },
    { id: 3, author_id: 'mafalda', title: '瑪法達星座運勢／天蠍座 10.14～10.20', published_at: '2026-10-14T00:00:00.000Z', kind: 'weekly', url: 'https://example.com/scorpio' },
    { id: 4, author_id: 'tang', title: '唐綺陽本週星座運勢', published_at: '2026-10-13T00:00:00.000Z', kind: 'weekly', url: 'https://example.com/tang' },
  ];

  const grouped = groupPosts(posts, 7);
  const mafalda = grouped.find(p => p.author_id === 'mafalda');
  const tang = grouped.find(p => p.author_id === 'tang');

  assert.equal(grouped.length, 2, 'should collapse 3 mafalda + 1 tang into 2');
  assert.equal(mafalda.url, 'https://example.com/scorpio', 'should pick 天蠍 for sun=7');
  assert.equal(mafalda._groupIds.length, 3, 'group should have 3 IDs');
  assert.ok(mafalda.title.includes('10.14'), 'grouped title should include date range');
  assert.equal(tang.url, 'https://example.com/tang', 'non-mafalda post unchanged');
  assert.ok(!tang._groupIds, 'non-mafalda post has no _groupIds');

  const grouped0 = groupPosts(posts, 0);
  const mafalda0 = grouped0.find(p => p.author_id === 'mafalda');
  assert.equal(mafalda0.url, 'https://example.com/aries', 'should pick 牡羊 for sun=0');
});

test('newCount handles grouped posts', () => {
  const posts = [
    { id: 'mafalda-week-2026-10-14', author_id: 'mafalda', _groupIds: [1, 2, 3], kind: 'weekly' },
    { id: 4, author_id: 'tang', kind: 'weekly' },
  ];
  const follows = { mafalda: true, tang: true };

  assert.equal(newCount(follows, posts, new Set()), 2, 'all unread');
  assert.equal(newCount(follows, posts, new Set([1, 2, 3])), 1, 'group read, tang unread');
  assert.equal(newCount(follows, posts, new Set([1, 2, 3, 4])), 0, 'all read');
  assert.equal(newCount(follows, posts, new Set([1])), 2, 'partial group still unread');
});

test('groupPosts handles empty and null posts', () => {
  assert.equal(groupPosts([], 0).length, 0);
  assert.equal(groupPosts(null, 0).length, 0);
});

test('cleanTitle strips doubled author name', () => {
  assert.equal(cleanTitle('瑪法達瑪法達星座運勢', '瑪法達'), '瑪法達星座運勢');
  assert.equal(cleanTitle('唐綺陽本週運勢', '唐綺陽'), '唐綺陽本週運勢');
  assert.equal(cleanTitle(null, '瑪法達'), null);
  assert.equal(cleanTitle('title', null), 'title');
});
