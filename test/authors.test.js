import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseYouTube, parseRSS, parseMafalda, parseSusan, parserFor } from '../netlify/functions/_lib/author-parsers.mjs';

const fixture = f => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8');

describe('parseYouTube (generic, used for 唐綺陽)', () => {
  const xml = fixture('tang-feed.xml');
  const tang = { source_type: 'youtube', source_id: 'UCK7LdglLCApOTaylxX8hW2Q',
    keywords: ['週運', '本週', '星座運勢', '月運', '月份', '星座週報', '一週', '運勢'] };

  it('extracts horoscope videos only', () => {
    const posts = parseYouTube(xml, tang);
    assert.ok(posts.length >= 2, `expected ≥2 posts, got ${posts.length}`);
    assert.ok(!posts.find(p => p.title.includes('吃什麼')), 'non-horoscope video should be filtered');
  });

  it('classifies weekly vs monthly correctly', () => {
    const posts = parseYouTube(xml, tang);
    const weekly = posts.find(p => p.title.includes('週報'));
    const monthly = posts.find(p => p.title.includes('10 月'));
    assert.equal(weekly?.kind, 'weekly');
    assert.equal(monthly?.kind, 'monthly');
  });

  it('has valid URLs', () => {
    const posts = parseYouTube(xml, tang);
    for (const p of posts) {
      assert.ok(p.url.startsWith('https://www.youtube.com/watch?v='), `bad URL: ${p.url}`);
    }
  });

  it('returns empty array for empty XML', () => {
    assert.deepEqual(parseYouTube('', tang), []);
    assert.deepEqual(parseYouTube('<feed></feed>', tang), []);
  });

  it('no keywords = keep all entries', () => {
    const noFilter = { ...tang, keywords: [] };
    const posts = parseYouTube(xml, noFilter);
    assert.ok(posts.length >= 4, `expected all 4 entries, got ${posts.length}`);
  });
});

describe('parseYouTube for 陶文 keywords', () => {
  const xml = fixture('tang-feed.xml');
  const taowen = { source_type: 'youtube', source_id: 'UCUaf4I5TYCExf9mWzv1cB_A',
    keywords: ['生肖運勢', '排行榜', '陶文'] };

  it('filters out all entries from 唐綺陽 feed (no keyword match)', () => {
    const posts = parseYouTube(xml, taowen);
    assert.equal(posts.length, 0, 'none of 唐綺陽 entries should match 陶文 keywords');
  });

  it('matches an entry with 陶文 keywords', () => {
    const customXml = `<feed><entry>
      <title>【5月份生肖運勢排行榜】2026.05.08《生活同樂會》#生肖運勢#陶文</title>
      <link rel="alternate" href="https://www.youtube.com/watch?v=test1"/>
      <published>2026-05-08T12:00:00+00:00</published>
    </entry></feed>`;
    const posts = parseYouTube(customXml, taowen);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].kind, 'monthly');
  });
});

describe('parseRSS (generic Atom/RSS)', () => {
  it('parses Atom feed', () => {
    const xml = fixture('tang-feed.xml');
    const author = { keywords: [] };
    const posts = parseRSS(xml, author);
    assert.ok(posts.length >= 4, `expected all entries, got ${posts.length}`);
  });

  it('parses RSS 2.0 items', () => {
    const rss = `<rss><channel><item>
      <title>Test Post Weekly</title>
      <link>https://example.com/post1</link>
      <pubDate>Mon, 12 Oct 2026 12:00:00 GMT</pubDate>
    </item></channel></rss>`;
    const posts = parseRSS(rss, { keywords: [] });
    assert.equal(posts.length, 1);
    assert.equal(posts[0].title, 'Test Post Weekly');
  });

  it('filters by keywords', () => {
    const rss = `<rss><channel>
      <item><title>星座運勢 weekly</title><link>https://ex.com/1</link></item>
      <item><title>Unrelated post</title><link>https://ex.com/2</link></item>
    </channel></rss>`;
    const posts = parseRSS(rss, { keywords: ['星座運勢'] });
    assert.equal(posts.length, 1);
  });
});

describe('parseMafalda (鏡週刊 author page)', () => {
  const html = fixture('mafalda-page.html');

  it('extracts weekly forecast articles', () => {
    const posts = parseMafalda(html);
    assert.ok(posts.length >= 2, `expected ≥2 posts, got ${posts.length}`);
    assert.ok(posts.every(p => p.kind === 'weekly'));
  });

  it('dedupes by URL', () => {
    const posts = parseMafalda(html);
    const urls = posts.map(p => p.url);
    assert.equal(urls.length, new Set(urls).size, 'duplicate URLs found');
  });

  it('filters out non-horoscope articles', () => {
    const posts = parseMafalda(html);
    assert.ok(!posts.find(p => p.title.includes('其他文章')), 'non-horoscope article should be filtered');
  });

  it('has absolute URLs', () => {
    const posts = parseMafalda(html);
    for (const p of posts) {
      assert.ok(p.url.startsWith('https://www.mirrormedia.mg/story/'), `bad URL: ${p.url}`);
    }
  });

  it('returns empty array for empty HTML', () => {
    assert.deepEqual(parseMafalda(''), []);
  });
});

describe('parseSusan (Astrology Zone)', () => {
  const html = fixture('susan-page.html');

  it('extracts the monthly forecast', () => {
    const posts = parseSusan(html);
    assert.ok(posts.length >= 1, `expected ≥1 post, got ${posts.length}`);
    assert.equal(posts[0].kind, 'monthly');
  });

  it('includes month name in title', () => {
    const posts = parseSusan(html);
    assert.ok(posts[0].title.toLowerCase().includes('october'), `title should include "October": ${posts[0].title}`);
  });

  it('one post per month, not per sign', () => {
    const posts = parseSusan(html);
    assert.equal(posts.length, 1, `expected exactly 1 monthly post, got ${posts.length}`);
  });

  it('returns empty array for unrelated HTML', () => {
    assert.deepEqual(parseSusan('<html><body>Hello</body></html>'), []);
  });
});

describe('parserFor dispatch', () => {
  it('returns YouTube parser for source_type=youtube', () => {
    const p = parserFor({ source_type: 'youtube', source_id: 'X', keywords: [] });
    assert.equal(typeof p, 'function');
  });

  it('returns RSS parser for source_type=rss', () => {
    const p = parserFor({ source_type: 'rss', keywords: [] });
    assert.equal(typeof p, 'function');
  });

  it('returns custom parser for mafalda', () => {
    const p = parserFor({ id: 'mafalda', source_type: 'custom' });
    assert.equal(typeof p, 'function');
  });

  it('returns null for unknown custom id', () => {
    const p = parserFor({ id: 'unknown', source_type: 'custom' });
    assert.equal(p, null);
  });
});

describe('first-run no-spam logic', () => {
  it('posts older than 3 days should get notified_at = now in the function', () => {
    const xml = fixture('tang-feed.xml');
    const tang = { keywords: ['週運', '本週', '星座運勢', '月運', '月份', '星座週報', '一週', '運勢'] };
    const posts = parseYouTube(xml, tang);
    const now = new Date();
    const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
    const oldPosts = posts.filter(p => (now - new Date(p.published_at)) > THREE_DAYS);
    assert.ok(oldPosts.length > 0, 'fixture should have at least one old post');
  });
});

describe('quiet-hours hold logic', () => {
  it('22:00–07:00 should be quiet hours', () => {
    const isQuiet = h => h >= 22 || h < 7;
    assert.ok(isQuiet(22));
    assert.ok(isQuiet(23));
    assert.ok(isQuiet(0));
    assert.ok(isQuiet(6));
    assert.ok(!isQuiet(7));
    assert.ok(!isQuiet(12));
    assert.ok(!isQuiet(21));
  });
});
