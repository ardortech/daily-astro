-- Phase 4: push subscriptions, push log, and push_enabled on profiles.

-- 1. push_subscriptions: one row per device endpoint.
create table if not exists public.push_subscriptions (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references auth.users (id) on delete cascade,
  endpoint        text not null unique,
  p256dh          text not null,
  auth            text not null,
  lang            text not null default 'zh' check (lang in ('zh', 'en')),
  user_agent      text,
  created_at      timestamptz not null default now(),
  last_success_at timestamptz,
  fail_count      int not null default 0
);

create index if not exists push_subs_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

revoke all on table public.push_subscriptions from anon, authenticated;
grant select, insert, delete on table public.push_subscriptions to authenticated;
grant all on table public.push_subscriptions to service_role;

drop policy if exists "push_subs: read own" on public.push_subscriptions;
create policy "push_subs: read own" on public.push_subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "push_subs: insert own" on public.push_subscriptions;
create policy "push_subs: insert own" on public.push_subscriptions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "push_subs: delete own" on public.push_subscriptions;
create policy "push_subs: delete own" on public.push_subscriptions
  for delete to authenticated
  using ((select auth.uid()) = user_id);


-- 2. push_log: prevent double-sends within the same local date.
create table if not exists public.push_log (
  user_id    uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  kind       text not null default 'daily' check (kind in ('daily', 'test')),
  sent_at    timestamptz not null default now(),
  unique (user_id, local_date, kind)
);

alter table public.push_log enable row level security;

revoke all on table public.push_log from anon, authenticated;
grant select on table public.push_log to authenticated;
grant all on table public.push_log to service_role;

drop policy if exists "push_log: read own" on public.push_log;
create policy "push_log: read own" on public.push_log
  for select to authenticated
  using ((select auth.uid()) = user_id);


-- 3. Add push_enabled to profiles (master switch).
alter table public.profiles
  add column if not exists push_enabled boolean not null default false;

comment on column public.profiles.push_enabled is 'Master push switch: true only after the user grants notification permission and subscribes.';

-- Update the push index to include push_enabled.
drop index if exists public.profiles_push_idx;
create index profiles_push_idx on public.profiles (time_zone, push_time)
  where push_enabled and (daily_enabled or zodiac_daily_enabled);
