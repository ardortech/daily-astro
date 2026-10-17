-- Batch tracking for daily-readings (Message Batches API).
create table if not exists public.reading_batches (
  date    date primary key,
  batch_id text not null,
  status  text not null default 'pending',
  items   int  not null default 0,
  created_at timestamptz not null default now()
);
alter table public.reading_batches enable row level security;
grant all on public.reading_batches to service_role;

-- Add watch_out column to daily_readings.
alter table public.daily_readings add column if not exists watch_out text;

-- Delete template-fallback rows for 2026-10-16 from the failed run so they get regenerated.
delete from public.daily_readings where date = '2026-10-16';
