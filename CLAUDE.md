# 每日星座 (Daily Astro)

A zh-TW installable web app (PWA). Subscribers get a daily horoscope push and an
alert when 唐綺陽, 瑪法達 or Susan Miller post a new weekly/monthly forecast.
Primary audience: iPhone users in Taiwan, using it from the Home Screen.

`design/prototype.html` is the **approved** clickable prototype. Match its screens,
copy and look. The screens are onboarding (birth date, time, city,
「我不知道出生時間」) and three tabs: 今日 / 名師更新 / 通知. Scores are 1–5 stars (★★★☆☆).

## Stack

- **Vite + Preact** (JSX, hooks). No router; tabs are app state.
- **Netlify** hosting (`netlify.toml`). Phases 3–5 add Netlify Functions + Scheduled Functions.
- **Supabase Postgres**, from Phase 2 (profiles, readings, push subscriptions, author posts).
- Node 22 (`.nvmrc`, `NODE_VERSION` in netlify.toml; Vite 8 needs ≥ 22.12).

## Commands

```
npm run dev       # local dev server (service worker disabled in dev)
npm run build     # production build → dist/ (what Netlify runs)
npm run preview   # serve dist/ locally, service worker active
npm test          # node:test unit tests for src/astro
npm run icons     # redraw public/icons/*.png (python3 + Pillow)
```

## Layout

```
design/prototype.html      approved prototype (reference only, not shipped)
index.html                 app entry: manifest link, iOS Home Screen meta tags
src/main.jsx               render + service-worker registration (prod only)
src/app.jsx                app state: profile, tab, follows, prefs, toast
src/components/            one component per screen/part (TodayTab, FeedTab, NotifyTab, Onboarding, …)
src/i18n/zh-TW.js          ALL user-facing strings; functions where values are interpolated
src/i18n/index.js          exports `t` (single locale for now)
src/astro/                 chart + reading logic; returns indices, never words
src/data/sample.js         prototype fixture data (feed, authors' URLs, sample birth)
src/lib/                   localStorage wrapper, iOS/standalone detection
sw/sw.js                   service-worker template; vite.config.js injects the precache list → dist/sw.js
public/                    manifest.webmanifest, icons (192, 512, maskable 512, apple-touch 180)
test/                      node:test tests
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
- **Storage keys:** `astro.profile`, `astro.follows`, `astro.prefs`, `astro.installGuideDismissed`.
  They stay in localStorage until Phase 2 syncs them to Supabase.
- Service worker: bump nothing by hand. The cache version is a hash of the built file list.
  `/sw.js` is served with `Cache-Control: no-cache`.

## Phases

1. **Skeleton PWA** ✅: Vite + Preact, prototype screens as components on sample data,
   prototype sun/moon/rising math ported to `src/astro/`, manifest + app-shell service worker,
   push stub, iOS 「分享 → 加入主畫面」 guide, Netlify build.
2. **Astro engine + profiles:** replace `src/astro/math.js` with `astronomy-engine`
   (keep `chartFor` / `sky` / `reading` signatures). Use real IANA time zones per city,
   including historical DST (the current cities table has fixed UTC offsets). Store profiles in
   Supabase (anonymous auth or device id) instead of localStorage.
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

## Known Phase 1 limitations

- Astro math is the prototype's low-precision series. Fine for signs, but the moon can be off by a fraction of a degree, so near a sign boundary the sign can be wrong.
- City time zones are fixed offsets (no DST, no historical changes).
- 開啟通知 only shows a demo toast; the push handler in the service worker is a stub.
- Feed items are static fixtures.
