-- Profiles: 農曆 birth date, 生肖 and 八字 五行, plus the 每日生肖運勢 switch.
-- birth_date stays the 國曆 date; birth_calendar records which calendar the user entered,
-- and lunar_* always hold the 農曆 equivalent (lunar_month 1–12, lunar_leap for 閏月).

alter table public.profiles
  add column if not exists birth_calendar       text not null default 'solar',
  add column if not exists lunar_year           smallint,
  add column if not exists lunar_month          smallint,
  add column if not exists lunar_day            smallint,
  add column if not exists lunar_leap           boolean not null default false,
  add column if not exists zodiac               smallint,
  add column if not exists zodiac_uncertain     boolean not null default false,
  add column if not exists wuxing               jsonb,
  add column if not exists zodiac_daily_enabled boolean not null default true;

alter table public.profiles drop constraint if exists birth_calendar_valid;
alter table public.profiles add constraint birth_calendar_valid check (birth_calendar in ('solar', 'lunar'));
alter table public.profiles drop constraint if exists lunar_month_valid;
alter table public.profiles add constraint lunar_month_valid check (lunar_month between 1 and 12);
alter table public.profiles drop constraint if exists lunar_day_valid;
alter table public.profiles add constraint lunar_day_valid check (lunar_day between 1 and 30);
alter table public.profiles drop constraint if exists zodiac_valid;
alter table public.profiles add constraint zodiac_valid check (zodiac between 0 and 11);

comment on column public.profiles.birth_calendar is 'Calendar the birth date was entered in: solar (國曆) or lunar (農曆). birth_date is always 國曆.';
comment on column public.profiles.lunar_month is '農曆 month 1–12; lunar_leap = 閏月.';
comment on column public.profiles.zodiac is '生肖 = year branch 0–11 (子鼠 … 亥豬); the year starts at 立春.';
comment on column public.profiles.zodiac_uncertain is 'No birth time and 立春 fell on the birth day; UI shows 「約」.';
comment on column public.profiles.wuxing is '八字 五行: { pillars: [[stem, branch] × 3–4], counts: [木 火 土 金 水], day_master: stem, lucky_element: 0–4 }.';
comment on column public.profiles.zodiac_daily_enabled is 'The 每日生肖運勢 switch: false = no 生肖 line in the daily push.';
comment on column public.profiles.daily_enabled is 'The 每日星座運勢 switch: false = no 星座 line in the daily push.';

-- The Phase 4 push sender now skips users only when both switches are off.
drop index if exists public.profiles_push_idx;
create index profiles_push_idx on public.profiles (time_zone, push_time) where daily_enabled or zodiac_daily_enabled;

-- Existing grants and own-row RLS policies on profiles cover the new columns.
