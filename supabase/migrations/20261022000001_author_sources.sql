-- Phase 5b: generic author sources + 陶文.
-- Run this migration after 20261019000001_authors.sql.

-- 1. Add source columns to authors.
alter table public.authors
  add column if not exists source_type text not null default 'custom'
    check (source_type in ('youtube', 'rss', 'custom')),
  add column if not exists source_id   text not null default '',
  add column if not exists keywords    text[] not null default '{}',
  add column if not exists category    text not null default '星座'
    check (category in ('星座', '生肖'));

comment on column public.authors.source_type is 'youtube = YouTube RSS via channel id; rss = generic RSS/Atom; custom = hand-coded parser';
comment on column public.authors.source_id   is 'YouTube channel id, or feed URL for rss. Empty for custom.';
comment on column public.authors.keywords    is 'Title must match at least one keyword (case-insensitive). Empty = keep all.';
comment on column public.authors.category    is 'UI grouping tag: 星座 or 生肖.';

-- 2. Backfill existing authors.
update public.authors set source_type = 'youtube', source_id = 'UCK7LdglLCApOTaylxX8hW2Q',
  keywords = '{週運,本週,星座運勢,月運,月份,星座週報,一週,運勢}', category = '星座'
  where id = 'tang';

update public.authors set source_type = 'custom', category = '星座' where id = 'mafalda';
update public.authors set source_type = 'custom', category = '星座' where id = 'susan';

-- 3. Insert 陶文 (飛碟聯播網《生活同樂會》).
insert into public.authors (id, name_zh, name_en, source_label, feed_url, homepage_url, cadence,
  source_type, source_id, keywords, category)
values (
  'taowen',
  '陶文',
  'Tao Wen',
  '飛碟聯播網《生活同樂會》',
  'https://www.youtube.com/feeds/videos.xml?channel_id=UCUaf4I5TYCExf9mWzv1cB_A',
  'https://www.youtube.com/channel/UCUaf4I5TYCExf9mWzv1cB_A',
  'monthly',
  'youtube',
  'UCUaf4I5TYCExf9mWzv1cB_A',
  '{生肖運勢,排行榜,陶文}',
  '生肖'
) on conflict (id) do nothing;

-- Template for adding a new YouTube teacher:
-- insert into authors (id, name_zh, name_en, source_type, source_id, keywords, cadence, category,
--   source_label, feed_url, homepage_url, active)
-- values (
--   'short_id',           -- unique slug
--   '中文名',              -- display name
--   'English Name',
--   'youtube',             -- source_type
--   'UC___CHANNEL_ID___',  -- YouTube channel id (starts with UC)
--   '{keyword1,keyword2}', -- title filter (empty = keep all)
--   'weekly',              -- cadence: weekly | monthly | both
--   '星座',                -- category: 星座 | 生肖
--   'YouTube・頻道名稱',    -- source_label shown in UI
--   'https://www.youtube.com/feeds/videos.xml?channel_id=UC___CHANNEL_ID___',
--   'https://www.youtube.com/channel/UC___CHANNEL_ID___',
--   true
-- );
