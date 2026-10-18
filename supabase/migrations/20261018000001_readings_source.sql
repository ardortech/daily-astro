-- Track whether each reading came from AI or template fallback.
-- Default 'template' so existing rows (all templates from the bug) are correctly marked.
alter table public.daily_readings
  add column if not exists source text not null default 'template';

-- Delete all rows for 2026-10-18 so re-collect can replace templates with AI results.
delete from public.daily_readings where date = '2026-10-18';

-- Reset the batch status so collect can re-run.
update public.reading_batches set status = 'pending' where date = '2026-10-18';
