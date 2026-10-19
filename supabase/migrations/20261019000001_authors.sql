-- Phase 5: author tracker (唐綺陽, 瑪法達, Susan Miller).
-- Run this single migration before merging Phase 5.

-- 1. authors: the reference table for forecast sources.
create table if not exists public.authors (
  id              text primary key,
  name_zh         text not null,
  name_en         text not null,
  source_label    text not null,
  feed_url        text not null,
  homepage_url    text not null,
  cadence         text not null check (cadence in ('weekly', 'monthly', 'both')),
  active          boolean not null default true,
  last_checked_at timestamptz,
  last_found_at   timestamptz,
  last_error      text
);

insert into public.authors (id, name_zh, name_en, source_label, feed_url, homepage_url, cadence) values
  ('tang',    '唐綺陽', 'Tang Chi-Yang',
   'YouTube・唐綺陽官方專屬頻道',
   'https://www.youtube.com/feeds/videos.xml?channel_id=UCK7LdglLCApOTaylxX8hW2Q',
   'https://www.youtube.com/channel/UCK7LdglLCApOTaylxX8hW2Q',
   'both'),
  ('mafalda', '瑪法達', 'Mafalda',
   '鏡週刊・瑪法達星座運勢',
   'https://www.mirrormedia.mg/author/167',
   'https://www.mirrormedia.mg/author/167',
   'weekly'),
  ('susan',   'Susan Miller', 'Susan Miller',
   'Astrology Zone',
   'https://www.astrologyzone.com/horoscopes/',
   'https://www.astrologyzone.com/horoscopes/',
   'monthly')
on conflict (id) do nothing;

-- RLS: public read, service_role writes.
alter table public.authors enable row level security;

revoke all on table public.authors from anon, authenticated;
grant select on table public.authors to authenticated;
grant all on table public.authors to service_role;

drop policy if exists "authors: public read" on public.authors;
create policy "authors: public read" on public.authors
  for select to authenticated
  using (true);


-- 2. author_posts: individual forecast posts (title / date / link only).
create table if not exists public.author_posts (
  id           bigint generated always as identity primary key,
  author_id    text not null references public.authors (id) on delete cascade,
  url          text not null unique,
  title        text not null,
  published_at timestamptz not null default now(),
  kind         text not null default 'other' check (kind in ('weekly', 'monthly', 'other')),
  created_at   timestamptz not null default now(),
  notified_at  timestamptz
);

create index if not exists author_posts_author_idx on public.author_posts (author_id, published_at desc);

-- Public read, service_role writes.
alter table public.author_posts enable row level security;

revoke all on table public.author_posts from anon, authenticated;
grant select on table public.author_posts to authenticated;
grant all on table public.author_posts to service_role;

drop policy if exists "author_posts: public read" on public.author_posts;
create policy "author_posts: public read" on public.author_posts
  for select to authenticated
  using (true);


-- 3. follows: replace the check constraint with an FK to authors(id).
--    Existing rows have author_id in ('tang','mafalda','susan') which are now in authors(id).
alter table public.follows drop constraint if exists follows_author_id_check;
alter table public.follows
  add constraint follows_author_id_fk foreign key (author_id)
  references public.authors (id) on delete cascade;


-- 4. profiles: add authors_push_enabled.
alter table public.profiles
  add column if not exists authors_push_enabled boolean not null default true;

comment on column public.profiles.authors_push_enabled is 'Master switch for author-post push notifications.';


-- 5. post_reads: tracks which posts each user has seen (for unread badge).
create table if not exists public.post_reads (
  user_id  uuid not null references auth.users (id) on delete cascade,
  post_id  bigint not null references public.author_posts (id) on delete cascade,
  read_at  timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.post_reads enable row level security;

revoke all on table public.post_reads from anon, authenticated;
grant select, insert on table public.post_reads to authenticated;
grant all on table public.post_reads to service_role;

drop policy if exists "post_reads: read own" on public.post_reads;
create policy "post_reads: read own" on public.post_reads
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "post_reads: insert own" on public.post_reads;
create policy "post_reads: insert own" on public.post_reads
  for insert to authenticated
  with check ((select auth.uid()) = user_id);


-- 6. push_log: extend the kind check to include 'author'.
alter table public.push_log drop constraint if exists push_log_kind_check;
alter table public.push_log
  add constraint push_log_kind_check check (kind in ('daily', 'test', 'author'));
-- Also update the unique constraint to include post-level dedup for author pushes.
-- (The existing unique on (user_id, local_date, kind) stays for daily/test;
--  author pushes are deduped per post via notified_at on author_posts + push_log.)
