// Source parsers for the three authors. Each exports a function that takes
// the fetched text (XML or HTML) and returns an array of { url, title, published_at, kind }.
// A parser that fails or returns 0 items logs a warning; it never throws.

const USER_AGENT = 'JiguangBot/1.0 (+https://astro.klchang.com.tw)';

// ---- Shared fetch with ETag / If-Modified-Since ----
const etags = new Map();

export async function politeGet(url) {
  const headers = { 'User-Agent': USER_AGENT };
  const cached = etags.get(url);
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  if (cached?.lastModified) headers['If-Modified-Since'] = cached.lastModified;

  const res = await fetch(url, { headers });
  if (res.status === 304) return { status: 304, text: null };
  const text = await res.text();
  etags.set(url, {
    etag: res.headers.get('etag') || null,
    lastModified: res.headers.get('last-modified') || null,
  });
  return { status: res.status, text };
}

// ---- 唐綺陽 (YouTube RSS) ----
// Keywords that indicate a horoscope forecast video
const TANG_WEEKLY_RE = /週運|本週|星座運勢週|星座週報|一週/;
const TANG_MONTHLY_RE = /月運|月份|月星座/;
const TANG_HOROSCOPE_RE = /週運|本週|星座運勢|月運|月份|星座週報|一週|運勢/;

export function parseTang(xml) {
  const entries = [];
  // YouTube RSS uses Atom <entry> elements
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    const title = xmlText(block, 'title');
    const url = xmlAttr(block, 'link', 'href') || xmlText(block, 'link');
    const published = xmlText(block, 'published') || xmlText(block, 'updated');
    if (!title || !url) continue;

    // Only keep horoscope-related videos
    if (!TANG_HOROSCOPE_RE.test(title)) continue;

    let kind = 'other';
    if (TANG_MONTHLY_RE.test(title)) kind = 'monthly';
    else if (TANG_WEEKLY_RE.test(title)) kind = 'weekly';

    entries.push({
      url,
      title: title.trim(),
      published_at: published ? new Date(published).toISOString() : new Date().toISOString(),
      kind,
    });
  }
  return entries;
}

// ---- 瑪法達 (鏡週刊 author page HTML) ----
// The author page lists articles as JSON-LD or as HTML article cards.
// We parse <a> links that match the article URL pattern.
const MAFALDA_ARTICLE_RE = /\/story\/[^"'\s]+/g;
const MAFALDA_TITLE_RE = /瑪法達.*?星座運勢/;

export function parseMafalda(html) {
  const entries = [];
  const seen = new Set();

  // Try to find structured article data first (JSON-LD or meta)
  // Fall back to link + text extraction
  const articleRe = /<a[^>]*href="(\/story\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = articleRe.exec(html)) !== null) {
    const path = m[1].replace(/^\/story\/amp\//, '/story/');
    const url = `https://www.mirrormedia.mg${path}`;
    if (seen.has(url)) continue;
    seen.add(url);

    // Extract visible text from the link
    const rawText = m[2].replace(/<[^>]+>/g, '').trim();
    if (!rawText || !MAFALDA_TITLE_RE.test(rawText)) continue;

    // Extract date range from title like "瑪法達星座運勢 10.14～10.20"
    const dateMatch = rawText.match(/(\d{1,2})\.(\d{1,2})[～~-](\d{1,2})\.(\d{1,2})/);
    let published_at;
    if (dateMatch) {
      const now = new Date();
      const month = parseInt(dateMatch[1], 10);
      const day = parseInt(dateMatch[2], 10);
      const year = month > now.getMonth() + 3 ? now.getFullYear() - 1 : now.getFullYear();
      published_at = new Date(year, month - 1, day).toISOString();
    } else {
      published_at = new Date().toISOString();
    }

    entries.push({
      url,
      title: rawText.slice(0, 120),
      published_at,
      kind: 'weekly',
    });
  }

  return entries;
}

// ---- Susan Miller (Astrology Zone) ----
// We check the horoscopes page for the current month's forecast.
// Susan updates once per month; we detect the month in the page title/heading.
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'];

export function parseSusan(html) {
  const entries = [];

  // Look for "Your <Month> Horoscope" pattern
  const monthRe = /your\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})?\s*horoscope/gi;
  let m;
  const seen = new Set();
  while ((m = monthRe.exec(html)) !== null) {
    const monthName = m[1].toLowerCase();
    const monthIdx = MONTH_NAMES.indexOf(monthName);
    if (monthIdx < 0) continue;
    const now = new Date();
    const year = m[2] ? parseInt(m[2], 10) : (monthIdx > now.getMonth() + 1 ? now.getFullYear() - 1 : now.getFullYear());
    const key = `${year}-${monthIdx}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const title = `Your ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year} Horoscope by Susan Miller`;
    entries.push({
      url: 'https://www.astrologyzone.com/horoscopes/',
      title,
      published_at: new Date(year, monthIdx, 1).toISOString(),
      kind: 'monthly',
    });
  }

  // If no match from regex, try to detect from meta or heading
  if (entries.length === 0) {
    const titleMatch = html.match(/<title[^>]*>([^<]*horoscope[^<]*)<\/title>/i) ||
                        html.match(/<h1[^>]*>([^<]*horoscope[^<]*)<\/h1>/i);
    if (titleMatch) {
      const text = titleMatch[1];
      for (let i = 0; i < MONTH_NAMES.length; i++) {
        if (text.toLowerCase().includes(MONTH_NAMES[i])) {
          const now = new Date();
          const year = i > now.getMonth() + 1 ? now.getFullYear() - 1 : now.getFullYear();
          entries.push({
            url: 'https://www.astrologyzone.com/horoscopes/',
            title: text.trim().slice(0, 120),
            published_at: new Date(year, i, 1).toISOString(),
            kind: 'monthly',
          });
          break;
        }
      }
    }
  }

  return entries;
}

// ---- Helpers ----
function xmlText(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const m = re.exec(xml);
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
}

function xmlAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i');
  const m = re.exec(xml);
  return m ? m[1] : '';
}
