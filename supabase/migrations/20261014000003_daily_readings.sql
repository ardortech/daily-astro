-- Daily readings: AI-generated 星座 and 生肖 readings, one batch per day per language.
-- 144 星座 readings (12 sun × 12 rising, rising = -1 for unknown) + 12 生肖 readings,
-- × 2 languages (zh, en) = 312 rows/day.

create table if not exists public.daily_readings (
  id           bigint generated always as identity primary key,
  date         date not null,
  kind         text not null check (kind in ('astro', 'zodiac')),
  lang         text not null default 'zh' check (lang in ('zh', 'en')),
  sun          smallint not null default -1 check (sun between -1 and 11),
  rising       smallint not null default -1 check (rising between -1 and 11),
  zodiac       smallint not null default -1 check (zodiac between -1 and 11),
  headline     text not null,
  body         text not null,
  scores       smallint[] not null default '{}',
  what_changed text,
  created_at   timestamptz not null default now()
);

alter table public.daily_readings drop constraint if exists daily_readings_unique;
alter table public.daily_readings add constraint daily_readings_unique
  unique (date, kind, lang, sun, rising, zodiac);

comment on column public.daily_readings.kind is 'astro (星座) or zodiac (生肖).';
comment on column public.daily_readings.lang is 'Language: zh (Traditional Chinese) or en (English).';
comment on column public.daily_readings.sun is 'Sun sign 0–11 for kind=astro; -1 otherwise.';
comment on column public.daily_readings.rising is 'Rising sign 0–11 or -1 (unknown/N-A).';
comment on column public.daily_readings.zodiac is '生肖 branch 0–11 for kind=zodiac; -1 otherwise.';
comment on column public.daily_readings.headline is 'One-line headline.';
comment on column public.daily_readings.body is '2–3 sentence reading body.';
comment on column public.daily_readings.scores is '4 scores [整體, 愛情, 事業, 財運] each 1–5.';
comment on column public.daily_readings.what_changed is 'One-sentence diff from yesterday for the personal layer.';

create index if not exists daily_readings_astro_idx on public.daily_readings (date, lang, sun, rising) where kind = 'astro';
create index if not exists daily_readings_zodiac_idx on public.daily_readings (date, lang, zodiac) where kind = 'zodiac';

alter table public.daily_readings enable row level security;

revoke all on table public.daily_readings from anon, authenticated;
grant select on table public.daily_readings to anon, authenticated;
grant all on table public.daily_readings to service_role;

drop policy if exists "daily_readings: public read" on public.daily_readings;
create policy "daily_readings: public read" on public.daily_readings
  for select to anon, authenticated
  using (true);
