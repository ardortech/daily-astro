# 每日星座 (Daily Astro)

A zh-TW installable web app (PWA). Subscribers get a daily horoscope push and an
alert when 唐綺陽, 瑪法達 or Susan Miller post a new weekly/monthly forecast.
Primary audience: iPhone users in Taiwan, using it from the Home Screen.

`design/prototype.html` is the **approved** clickable prototype. Match its screens,
copy and look. The screens are onboarding (birth date, time, city,
「我不知道出生時間」) and three tabs: 今日 / 名師更新 / 通知. Scores are 1–5 stars (★★★☆☆).

## Production URL

**https://astro.klchang.com.tw** (custom domain on Netlify; set it as the primary domain so the
`*.netlify.app` URL redirects to it).

- The manifest keeps `start_url` and `scope` as `"/"`, and `id` too. Browsers resolve them against the
  manifest URL, so in production they become `https://astro.klchang.com.tw/`. Don't make them
  absolute: an absolute start_url on another origin is ignored, which would break Netlify deploy
  previews.
- `index.html` has `<link rel="canonical">` pointing at the production URL.
- Web push (Phase 4) is tied to this origin. Subscriptions and the Home Screen install don't carry
  over if the domain changes, so treat it as permanent.

## Stack

- **Vite + Preact** (JSX, hooks). No router; tabs are app state.
- **Netlify** hosting (`netlify.toml`). Phases 3–5 add Netlify Functions + Scheduled Functions.
- **Supabase Postgres** (`@supabase/supabase-js`): profiles, follows, daily_sky; later readings, push
  subscriptions, author posts. Each device signs in with **anonymous auth** on first launch.
- **astronomy-engine** for sun/moon/ascendant; birth times → UTC via the city's IANA zone (`Intl`).

## Environment variables (set in Netlify)

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`: browser client. Without them (local dev, no
  `.env.local`) the app runs on localStorage only.
- `SUPABASE_SECRET_KEY`: Netlify Functions only (bypasses RLS). Never prefix it with `VITE_`.
  Functions read the URL from `SUPABASE_URL`, falling back to `VITE_SUPABASE_URL`.
- Node 22 (`.nvmrc`, `NODE_VERSION` in netlify.toml; Vite 8 needs ≥ 22.12).

## Commands

```
npm run dev       # local dev server (service worker disabled in dev)
npm run build     # production build → dist/ (what Netlify runs)
npm run preview   # serve dist/ locally, service worker active
npm test          # node:test unit tests (src/astro, src/lib/sync row mapping)
npm run icons     # redraw public/icons/*.png (python3 + Pillow)
```

## Layout

```
design/prototype.html      approved prototype (reference only, not shipped)
design/icon-source.png     icon master (white zodiac wheel on #1A2140); `npm run icons` builds public/icons/*
                           (incl. maskable 512, favicon 16/32) and public/favicon.ico from it
index.html                 app entry: manifest link, iOS Home Screen meta tags
src/main.jsx               render + service-worker registration (prod only)
src/app.jsx                app state: profile, tab, follows, prefs, toast
src/components/            one component per screen/part (TodayTab, FeedTab, NotifyTab, Onboarding, …)
src/i18n/zh-TW.js          ALL user-facing strings; functions where values are interpolated
src/i18n/index.js          exports `t` (single locale for now)
src/astro/                 chart + reading logic (astronomy-engine, IANA tz, ~50 cities); indices, never words
src/data/sample.js         prototype fixture data (feed, authors' URLs, sample birth)
src/lib/                   localStorage cache, Supabase client + sync, iOS/standalone detection
netlify/functions/         Netlify (Scheduled) Functions: daily-sky.mjs (00:00 Asia/Taipei → daily_sky)
supabase/migrations/       SQL migrations, run by hand in the Supabase SQL Editor in filename order
sw/sw.js                   service-worker template; vite.config.js injects the precache list → dist/sw.js
public/                    manifest.webmanifest, icons (192, 512, maskable 512, apple-touch 180)
test/                      node:test tests (astro charts, time zones, row mapping)
```

## Conventions

- **Strings:** every zh-TW UI string lives in `src/i18n/zh-TW.js`. To add English, create `en.js`
  with the same shape and pick the locale in `src/i18n/index.js`. Components read `t.*` and never
  hard-code copy. External post titles (feed data) are content, not UI copy.
- **Astro code returns indices** (sign 0–11, house 0–11, aspect 0–6, element 0–3) and the UI maps
  them through `t`. Sign order: 牡羊 … 雙魚. Element = sign % 4 (火 土 風 水).
- **Styles:** `src/styles.css` starts with the prototype CSS copied verbatim. Put PWA-only
  additions in the marked section at the bottom. Colours are tokens on `:root`, with a dark theme.
- **Never store or display author forecast text.** Only title, date and link (copyright).
- **Storage keys:** `astro.profile`, `astro.follows`, `astro.prefs`, `astro.installGuideDismissed`,
  `astro.syncPending`. localStorage is the offline cache; Supabase is the source of truth.
  `src/lib/sync.js` pushes after every change and pulls at launch / when back online; a change that
  hasn't reached Supabase (`astro.syncPending`) is pushed before anything is pulled. The Supabase
  session itself is stored by supabase-js (`sb-*` keys).
- **Profiles:** without a birth time only sun + moon are stored (`birth_time`, `rising` null). If the
  Sun or Moon changes sign during that local day, `sun_uncertain` / `moon_uncertain` is set and the
  UI shows 太陽（約）/ 月亮（約）. The 每日運勢 switch is `daily_enabled`, the push time `push_time`.
- **City ids** are stored in `profiles.city_id`: add cities, never rename or remove an id.
- **Database:** every table has RLS, explicit grants (tables aren't exposed by default) and
  own-row policies on `(select auth.uid()) = user_id`. New migrations go in `supabase/migrations/`.
- Service worker: bump nothing by hand. The cache version is a hash of the built file list.
  `/sw.js` is served with `Cache-Control: no-cache`.

## Phases

1. **Skeleton PWA** ✅: Vite + Preact, prototype screens as components on sample data,
   prototype sun/moon/rising math ported to `src/astro/`, manifest + app-shell service worker,
   push stub, iOS 「分享 → 加入主畫面」 guide, Netlify build.
2. **Astro engine + profiles** ✅: replace `src/astro/math.js` with `astronomy-engine`
   (keep `chartFor` / `sky` / `reading` signatures). Use real IANA time zones per city,
   including historical DST (the current cities table has fixed UTC offsets). Store profiles in
   Supabase (anonymous auth) instead of localStorage. daily_sky written by a Scheduled Function.
3. **Daily readings:** a rule engine picks the day's factors (moon house, aspects, lucky colour/item,
   1–5 star scores), then Claude Haiku writes the zh-TW text. Make 144 readings/day (12 sun signs ×
   12 rising signs, "unknown rising" falls back to sun), generated once by a Scheduled Function and
   cached in Supabase. Clients and pushes read the cache and never call the model per user.
4. **Web push (VAPID):** subscribe from the 通知 tab (iOS requires the Home Screen app). Store each
   user's push time + IANA time zone. A Scheduled Function runs **every minute** and sends to users
   whose local time matches. Replace the push stub in `sw/sw.js`. iOS revokes subscriptions if a
   push shows no notification, so always show one.
5. **Author tracker:** 唐綺陽 via YouTube channel RSS; poll 鏡週刊 for 瑪法達 (weekly, Wednesdays);
   poll Astrology Zone for Susan Miller (monthly). Store **title / date / link only, never forecast
   text**. A new post pushes to followers and replaces `src/data/sample.js`.

## Known limitations

- Birth places are limited to the city list (no search / custom coordinates).
- 開啟通知 only shows a demo toast; the push handler in the service worker is a stub.
- Feed items are static fixtures.
