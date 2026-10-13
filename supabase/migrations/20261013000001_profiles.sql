-- Profiles: one row per device user (Supabase anonymous auth).
-- Sign indices 0–11 run 牡羊 … 雙魚. Without a birth time only sun + moon are
-- stored: birth_time and rising are null.

create table if not exists public.profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  birth_date     date not null,
  birth_time     time,
  city_id        text not null,
  sun            smallint not null check (sun between 0 and 11),
  moon           smallint not null check (moon between 0 and 11),
  moon_uncertain boolean not null default false,
  rising         smallint check (rising between 0 and 11),
  push_time      time not null default '07:30',
  time_zone      text not null default 'Asia/Taipei',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint rising_needs_birth_time check (rising is null or birth_time is not null)
);

comment on column public.profiles.moon_uncertain is 'No birth time and the Moon changed sign that day; UI shows 月亮（約）.';
comment on column public.profiles.time_zone is 'Device IANA zone, used to send the daily push at push_time local time.';

-- Keep updated_at current on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- The Phase 4 push sender scans by time zone + push time.
create index if not exists profiles_push_idx on public.profiles (time_zone, push_time);

-- Access: signed-in users (anonymous users have the authenticated role) see only their own row.
alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "profiles: delete own" on public.profiles;
create policy "profiles: delete own" on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = user_id);
