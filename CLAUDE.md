# 每日吉光 (Daily Astro)

A zh-TW installable web app (PWA), 「吉光」 on the Home Screen, tagline 日日是好日. Subscribers get a
daily 星座 + 生肖 push and an alert when 唐綺陽, 瑪法達 or Susan Miller post a new weekly/monthly forecast.
Primary audience: iPhone users in Taiwan, using it from the Home Screen.

`design/prototype.html` is the **approved** clickable prototype. Match its screens, copy, flow and
palette (晨光杏 by day, navy night sky in dark mode). Scores are 1–5 stars (★★★☆☆).

Flow: first launch shows the welcome + birth form only (國曆 / 農曆, time, city, 「我不知道出生時間」), no
tab bar. On iPhone (Safari, Chrome, Edge, Firefox) outside the Home Screen app, and in in-app
browsers (LINE, Facebook, Instagram, Messenger: 「請用 Safari 或 Chrome 開啟」 + 複製連結), it shows the
install guide instead: birth details are only collected inside the installed app (it has its own
storage). Android Chrome / Edge / Samsung Internet get a 安裝吉光 card (beforeinstallprompt, else menu
steps) above the form with 稍後; desktop gets no card. Browser detection: `installPlatform()` in
`src/lib/platform.js`. After the first save, a one-time
「已為你建立專屬星盤」 screen, then tabs 首頁 / 星座 / 生肖 / 名師 / 設定. Every later launch opens on 首頁;
the birth form only comes back via 設定 → 我的資料 → 「出生資料填錯了？修改」. No account linking.

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
- **lunar-javascript** (MIT) for 農曆 ⇄ 國曆, 生肖, 八字 and the almanac (`src/astro/chinese.js`). Its
  output is Simplified Chinese, so use its indices (干支 etc.) and map words through `t`.

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
npm test          # node:test unit tests (src/astro, src/lib/sync row mapping, functions load in plain Node)
```

## Layout

```
design/prototype.html      approved prototype (reference only, not shipped)
design/icons/              ready-made app icons (曙光: sunrise on #1A2140) incl. icon-source.svg and 1024 master;
                           copied as-is to public/ — don't regenerate them
index.html                 app entry: manifest link, iOS Home Screen meta tags
src/main.jsx               render + service-worker registration (prod only)
src/app.jsx                app state: profile, view (tab / reveal / edit), follows, prefs, toast
src/components/            one component per screen/part (HomeTab, AstroTab, ZodiacTab, FeedTab, SettingsTab, BirthForm, Reveal, …)
src/i18n/zh-TW.js          ALL user-facing strings; functions where values are interpolated
src/i18n/index.js          exports `t` (single locale for now)
src/astro/                 chart + reading logic (astronomy-engine, IANA tz, ~50 cities); indices, never words
src/astro/chinese.js       農曆, 生肖 (year starts at 立春), 八字 五行, almanac, 生肖 relation of the day
src/data/sample.js         prototype fixture data (feed, authors' URLs, sample birth)
src/lib/                   localStorage cache, Supabase client + sync, iOS/standalone detection
netlify/functions/         Netlify (Scheduled) Functions: daily-sky.mjs (00:00 Asia/Taipei → daily_sky)
supabase/migrations/       SQL migrations, run by hand in the Supabase SQL Editor in filename order
sw/sw.js                   service-worker template; vite.config.js injects the precache list → dist/sw.js
public/                    manifest.webmanifest, icons at the root (icon-192/512, icon-maskable-512, apple-touch-icon,
                           favicon.svg / -32 / -16 / .ico), copied from design/icons/
test/                      node:test tests (astro charts, time zones, 農曆 / 生肖 / 八字, row mapping)
```

## Conventions

- **Strings:** every zh-TW UI string lives in `src/i18n/zh-TW.js`. To add English, create `en.js`
  with the same shape and pick the locale in `src/i18n/index.js`. Components read `t.*` and never
  hard-code copy. External post titles (feed data) are content, not UI copy.
- **Astro code returns indices** (sign 0–11, house 0–11, aspect 0–6, element 0–3) and the UI maps
  them through `t`. Sign order: 牡羊 … 雙魚. Element = sign % 4 (火 土 風 水). Chinese calendar: stem 0–9
  (甲 … 癸), branch / 生肖 0–11 (子鼠 … 亥豬), 五行 0–4 (木 火 土 金 水), relation 0–6 (六合 三合 比和 平 害 刑 沖).
- **Styles:** `src/styles.css` starts with the prototype CSS copied verbatim. Put PWA-only
  additions in the marked section at the bottom. Colours are tokens on `:root` (晨光杏 light, navy
  dark); never hard-code colours, including canvas drawing (read the tokens). The app icon stays navy.
- **Never store or display author forecast text.** Only title, date and link (copyright).
- **Storage keys:** `astro.profile`, `astro.follows`, `astro.prefs`, `astro.installGuideDismissed`,
  `astro.syncPending`. localStorage is the offline cache; Supabase is the source of truth.
  `src/lib/sync.js` pushes after every change and pulls at launch / when back online; a change that
  hasn't reached Supabase (`astro.syncPending`) is pushed before anything is pulled. The Supabase
  session itself is stored by supabase-js (`sb-*` keys).
- **Profiles:** without a birth time only sun + moon are stored (`birth_time`, `rising` null). If the
  Sun or Moon changes sign during that local day, `sun_uncertain` / `moon_uncertain` is set and the
  UI shows 太陽（約）/ 月亮（約）. Likewise `zodiac_uncertain` (born on 立春 day, no time) shows 「約」.
  `birth_date` is always 國曆; `birth_calendar` says what was entered, `lunar_*` hold the 農曆 date,
  `wuxing` the 八字 (pillars, counts, day_master, lucky_element). Switches: 每日星座運勢 =
  `daily_enabled`, 每日生肖運勢 = `zodiac_daily_enabled`; push time `push_time`.
- **City ids** are stored in `profiles.city_id`: add cities, never rename or remove an id.
- **astronomy-engine** is imported as `#astronomy-engine` (package.json `imports`), never by its bare
  name: Node gets its CommonJS build (`src/astro/engine.node.cjs`), the browser its ESM build. The
  functions runtime doesn't detect ESM syntax in `.js` files, so the package's ESM build fails there.
  `test/functions.test.js` loads each function in plain Node with detection off.
- **Database:** every table has RLS, explicit grants (tables aren't exposed by default) and
  own-row policies on `(select auth.uid()) = user_id`. New migrations go in `supabase/migrations/`.
- Service worker: bump nothing by hand. The cache version is a hash of the built file list, the
  contents of the public/ shell files (icons, manifest) and sw/sw.js itself. The page, icons and
  manifest are network-first (cache only offline); hashed /assets/* are cache-first.
- **Home Screen icon:** `<link rel="apple-touch-icon" sizes="180x180">` is static in index.html;
  `/apple-touch-icon.png` and `/apple-touch-icon-precomposed.png` are real files at the root. Never add a
  forced catch-all redirect (it would serve index.html for them); test/pwa.test.js checks this.
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
- Readings, 宜/忌 and push text are the prototype's rule-based templates until Phase 3.
- lunar-javascript adds ~110 kB gzipped to the bundle (precached by the service worker).
- Feed items are static fixtures.
