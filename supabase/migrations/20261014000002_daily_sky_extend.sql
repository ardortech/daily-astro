-- Extend daily_sky with planetary positions, Moon illumination, VOC window and almanac data.
-- Phase 3 Stage 2: the nightly function now writes a richer row.

alter table public.daily_sky
  add column if not exists sun_sign       smallint check (sun_sign between 0 and 11),
  add column if not exists sun_lon        numeric(8, 4) check (sun_lon >= 0 and sun_lon < 360),
  add column if not exists moon_illum     numeric(5, 4) check (moon_illum >= 0 and moon_illum <= 1),
  add column if not exists moon_waxing    boolean,
  add column if not exists mercury_sign   smallint check (mercury_sign between 0 and 11),
  add column if not exists mercury_lon    numeric(8, 4) check (mercury_lon >= 0 and mercury_lon < 360),
  add column if not exists mercury_retro  boolean not null default false,
  add column if not exists venus_sign     smallint check (venus_sign between 0 and 11),
  add column if not exists venus_lon      numeric(8, 4) check (venus_lon >= 0 and venus_lon < 360),
  add column if not exists venus_retro    boolean not null default false,
  add column if not exists mars_sign      smallint check (mars_sign between 0 and 11),
  add column if not exists mars_lon       numeric(8, 4) check (mars_lon >= 0 and mars_lon < 360),
  add column if not exists mars_retro     boolean not null default false,
  add column if not exists voc_start      timestamptz,
  add column if not exists voc_end        timestamptz,
  add column if not exists day_stem       smallint check (day_stem between 0 and 9),
  add column if not exists day_branch     smallint check (day_branch between 0 and 11),
  add column if not exists jianchu        smallint check (jianchu between 0 and 11),
  add column if not exists yi             text[] not null default '{}',
  add column if not exists ji             text[] not null default '{}',
  add column if not exists chong          smallint check (chong between 0 and 11),
  add column if not exists sha            smallint check (sha between 0 and 3),
  add column if not exists cai            smallint check (cai between 0 and 7),
  add column if not exists good_hours     smallint[] not null default '{}';

comment on column public.daily_sky.sun_sign is 'Sun sign 0–11 (牡羊…雙魚).';
comment on column public.daily_sky.moon_illum is 'Moon illuminated fraction 0.0000–1.0000.';
comment on column public.daily_sky.moon_waxing is 'True if the Moon is waxing (phase < 180°).';
comment on column public.daily_sky.mercury_retro is 'True if Mercury is retrograde.';
comment on column public.daily_sky.voc_start is 'Moon void-of-course start (last major aspect before ingress).';
comment on column public.daily_sky.voc_end is 'Moon void-of-course end (Moon ingress into next sign).';
comment on column public.daily_sky.day_stem is '日干 0–9 (甲…癸).';
comment on column public.daily_sky.day_branch is '日支 0–11 (子…亥).';
comment on column public.daily_sky.jianchu is '建除 0–11 (建除滿平定執破危成收開閉).';
comment on column public.daily_sky.yi is '宜 array (Traditional Chinese).';
comment on column public.daily_sky.ji is '忌 array (Traditional Chinese).';
comment on column public.daily_sky.chong is '沖 branch (opposite of day_branch).';
comment on column public.daily_sky.sha is '煞 direction 0–3 (東南西北).';
comment on column public.daily_sky.cai is '財神 direction 0–7 (正東 東南 正南 西南 正西 西北 正北 東北).';
comment on column public.daily_sky.good_hours is '黃道吉時 branch indices.';

-- Existing grants and read policy cover the new columns.
