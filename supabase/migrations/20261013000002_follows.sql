-- Follows: a row means the user follows that author. Author ids match src/data/sample.js.

create table if not exists public.follows (
  user_id    uuid not null references auth.users (id) on delete cascade,
  author_id  text not null check (author_id in ('tang', 'mafalda', 'susan')),
  created_at timestamptz not null default now(),
  primary key (user_id, author_id)
);

-- The Phase 5 tracker looks up followers by author.
create index if not exists follows_author_idx on public.follows (author_id);

alter table public.follows enable row level security;

revoke all on table public.follows from anon, authenticated;
grant select, insert, delete on table public.follows to authenticated;
grant all on table public.follows to service_role;

drop policy if exists "follows: read own" on public.follows;
create policy "follows: read own" on public.follows
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "follows: insert own" on public.follows;
create policy "follows: insert own" on public.follows
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "follows: delete own" on public.follows;
create policy "follows: delete own" on public.follows
  for delete to authenticated
  using ((select auth.uid()) = user_id);
