-- 問吉光: switch from 5/day to 10/rolling-hour quota.
-- Drop the question/answer columns (no longer stored); keep asked_at for rate limiting.
-- Rows older than 7 days are deleted by the existing daily cleanup.

alter table public.ask_log drop column if exists question;
alter table public.ask_log drop column if exists answer;
