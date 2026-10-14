-- Daily readings: AI-generated 星座 and 生肖 readings, one batch per day.
-- 144 星座 readings (12 sun × 12 rising, rising = -1 for unknown) + 12 生肖 readings.

create table if not exists public.daily_readings (
  date         date not null,
  kind         text not null check (kind in ('astro', 'zodiac')),
  sun          smallint check (sun between 0 and 11),
  rising       smallint check (rising between -1 and 11),
  zodiac       smallint check (zodiac between 0 and 11),
  headline     text not null,
  body         text not null,
  scores       smallint[] not null default '{}',
  what_changed text,
  created_at   timestamptz not null default now(),
  primary key (date, kind, coalesce(sun, -1), coalesce(rising, -1), coalesce(zodiac, -1))
);

comment on column public.daily_readings.kind is 'astro (星座) or zodiac (生肖).';
comment on column public.daily_readings.sun is 'Sun sign 0–11, for kind=astro.';
comment on column public.daily_readings.rising is 'Rising sign 0–11 or -1 (unknown), for kind=astro.';
comment on column public.daily_readings.zodiac is '生肖 branch 0–11, for kind=zodiac.';
comment on column public.daily_readings.headline is 'One-line headline (zh-TW).';
comment on column public.daily_readings.body is '2–3 sentence reading body (zh-TW).';
comment on column public.daily_readings.scores is '4 scores [整體, 愛情, 事業, 財運] each 1–5.';
comment on column public.daily_readings.what_changed is 'One-sentence diff from yesterday for the personal layer.';

create index if not exists daily_readings_astro_idx on public.daily_readings (date, kind, sun, rising) where kind = 'astro';
create index if not exists daily_readings_zodiac_idx on public.daily_readings (date, kind, zodiac) where kind = 'zodiac';

alter table public.daily_readings enable row level security;

revoke all on table public.daily_readings from anon, authenticated;
grant select on table public.daily_readings to anon, authenticated;
grant all on table public.daily_readings to service_role;

drop policy if exists "daily_readings: public read" on public.daily_readings;
create policy "daily_readings: public read" on public.daily_readings
  for select to anon, authenticated
  using (true);
