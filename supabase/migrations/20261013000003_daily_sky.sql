-- Daily sky: one row per Asia/Taipei calendar day, written at 00:00 Taipei by the
-- Netlify Scheduled Function netlify/functions/daily-sky.mjs (secret key).
-- Values are for 00:00 Taipei time on `date`.

create table if not exists public.daily_sky (
  date                date primary key,
  moon_sign           smallint not null check (moon_sign between 0 and 11),
  moon_lon            numeric(8, 4) not null check (moon_lon >= 0 and moon_lon < 360),
  phase               numeric(8, 4) not null check (phase >= 0 and phase < 360),
  moon_sign_change_at timestamptz,
  created_at          timestamptz not null default now()
);

comment on column public.daily_sky.moon_lon is 'Moon apparent ecliptic longitude (tropical, of date), degrees.';
comment on column public.daily_sky.phase is 'Moon–Sun elongation in degrees: 0 new, 90 first quarter, 180 full, 270 last quarter.';
comment on column public.daily_sky.moon_sign_change_at is 'When the Moon enters the next sign during this Taipei day; null if it does not.';

-- Public, read-only to clients; only the service role (secret key) writes.
alter table public.daily_sky enable row level security;

revoke all on table public.daily_sky from anon, authenticated;
grant select on table public.daily_sky to anon, authenticated;
grant all on table public.daily_sky to service_role;

drop policy if exists "daily_sky: public read" on public.daily_sky;
create policy "daily_sky: public read" on public.daily_sky
  for select to anon, authenticated
  using (true);
