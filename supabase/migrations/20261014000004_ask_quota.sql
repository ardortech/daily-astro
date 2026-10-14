-- 問吉光: per-user daily quota and question log.
-- question_text is kept for 30 days, then a scheduled cleanup NULLs it.

create table if not exists public.ask_log (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  asked_at     timestamptz not null default now(),
  question     text,
  answer       text,
  tokens_in    integer,
  tokens_out   integer
);

create index if not exists ask_log_user_day_idx on public.ask_log (user_id, asked_at);

alter table public.ask_log enable row level security;

revoke all on table public.ask_log from anon, authenticated;
grant select on table public.ask_log to authenticated;
grant all on table public.ask_log to service_role;

drop policy if exists "ask_log: read own" on public.ask_log;
create policy "ask_log: read own" on public.ask_log
  for select to authenticated
  using ((select auth.uid()) = user_id);

comment on column public.ask_log.question is 'Question text; NULLed after 30 days for privacy.';
