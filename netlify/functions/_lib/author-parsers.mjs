// Generic + custom author parsers. Each returns [{ url, title, published_at, kind }].
// source_type dispatch:
//   'youtube' → parseYouTube (shared for any YouTube channel, filtered by author.keywords)
//   'rss'     → parseRSS     (generic RSS/Atom, filtered by author.keywords)
//   'custom'  → CUSTOM_PARSERS[author.id]

const USER_AGENT = 'JiguangBot/1.0 (+https://astro.klchang.com.tw)';

// ---- Shared fetch with ETag / If-Modified-Since ----
const etags = new Map();

export async function politeGet(url) {
  const headers = { 'User-Agent': USER_AGENT };
  const cached = etags.get(url);
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  if (cached?.lastModified) headers['If-Modified-Since'] = cached.lastModified;

  const res = await fetch(url, { headers });
  const ct = res.headers.get('content-type') || '';
  if (res.status === 304) return { status: 304, text: null, contentType: ct, bytes: 0 };
  const text = await res.text();
  etags.set(url, {
    etag: res.headers.get('etag') || null,
    lastModified: res.headers.get('last-modified') || null,
  });
  return { status: res.status, text, contentType: ct, bytes: text.length };
}

// ---- Dispatch by source_type ----
export function parserFor(author) {
  if (author.source_type === 'youtube') return text => parseYouTube(text, author);
  if (author.source_type === 'rss') return text => parseRSS(text, author);
  return CUSTOM_PARSERS[author.id] || null;
}

// ---- Generic YouTube RSS parser ----
const WEEKLY_RE = /週運|本週|星座運勢週|星座週報|一週/;
const MONTHLY_RE = /月運|月份|月星座|月份.*排行/;

export function parseYouTube(xml, author) {
  const entries = [];
  const kw = (author.keywords || []).map(k => k.toLowerCase());
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml)) !== null) {
    const block = m[1];
    const title = xmlText(block, 'title');
    const url = xmlAttr(block, 'link', 'href') || xmlText(block, 'link');
    const published = xmlText(block, 'published') || xmlText(block, 'updated');
    if (!title || !url) continue;

    if (kw.length && !kw.some(k => title.toLowerCase().includes(k))) continue;

    let kind = 'other';
    if (MONTHLY_RE.test(title)) kind = 'monthly';
    else if (WEEKLY_RE.test(title)) kind = 'weekly';

    entries.push({
      url,
      title: title.trim(),
      published_at: published ? new Date(published).toISOString() : new Date().toISOString(),
      kind,
    });
  }
  return entries;
}

// ---- Generic RSS/Atom parser ----
export function parseRSS(xml, author) {
  const entries = [];
  const kw = (author.keywords || []).map(k => k.toLowerCase());

  // Try Atom <entry> first, then RSS <item>
  const isAtom = /<entry>/i.test(xml);
  const tagRe = isAtom ? /<entry>([\s\S]*?)<\/entry>/g : /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = tagRe.exec(xml)) !== null) {
    const block = m[1];
    const title = xmlText(block, 'title');
    const url = isAtom
      ? (xmlAttr(block, 'link', 'href') || xmlText(block, 'link'))
      : (xmlText(block, 'link') || xmlText(block, 'guid'));
    const published = xmlText(block, 'published') || xmlText(block, 'updated')
      || xmlText(block, 'pubDate') || xmlText(block, 'dc:date');
    if (!title || !url) continue;

    if (kw.length && !kw.some(k => title.toLowerCase().includes(k))) continue;

    let kind = 'other';
    if (MONTHLY_RE.test(title)) kind = 'monthly';
    else if (WEEKLY_RE.test(title)) kind = 'weekly';

    entries.push({
      url,
      title: title.trim().slice(0, 200),
      published_at: published ? new Date(published).toISOString() : new Date().toISOString(),
      kind,
    });
  }
  return entries;
}

// ---- Custom parsers (瑪法達, Susan Miller) ----

// 瑪法達 (鏡週刊 author page HTML)
const MAFALDA_TITLE_RE = /瑪法達.*?星座運勢/;

export function parseMafalda(html) {
  const entries = [];
  const seen = new Set();
  const articleRe = /<a[^>]*href="(\/story\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = articleRe.exec(html)) !== null) {
    const path = m[1].replace(/^\/story\/amp\//, '/story/');
    const url = `https://www.mirrormedia.mg${path}`;
    if (seen.has(url)) continue;
    seen.add(url);

    const rawText = m[2].replace(/<[^>]+>/g, '').trim();
    if (!rawText || !MAFALDA_TITLE_RE.test(rawText)) continue;

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

    entries.push({ url, title: rawText.slice(0, 120), published_at, kind: 'weekly' });
  }
  return entries;
}

// Susan Miller (Astrology Zone)
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'];

export function parseSusan(html) {
  const entries = [];
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

const CUSTOM_PARSERS = { mafalda: parseMafalda, susan: parseSusan };

// Also export old names so existing tests still import them
export { parseYouTube as parseTang };

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
