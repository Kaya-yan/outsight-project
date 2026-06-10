export interface RssArticle {
  title: string;
  url: string;
  publish_date: string | null;
  source: string;
  description: string | null;
  keyword_combo?: string;
}

interface RssFeed {
  name: string;
  url: string;
}

/** Per-feed health tracking (data-pipeline monitoring pattern) */
interface FeedHealth {
  url: string;
  name: string;
  lastSuccess: string | null;
  lastFailure: string | null;
  consecutiveFailures: number;
  lastArticleDate: string | null;
  totalArticles: number;
}

// In-memory feed health state (persists within a process lifetime)
const feedHealthMap = new Map<string, FeedHealth>();

export function getFeedHealth(): FeedHealth[] {
  return Array.from(feedHealthMap.values());
}

function updateFeedHealth(url: string, name: string, success: boolean, articleDate?: string | null) {
  let health = feedHealthMap.get(url);
  if (!health) {
    health = { url, name, lastSuccess: null, lastFailure: null, consecutiveFailures: 0, lastArticleDate: null, totalArticles: 0 };
    feedHealthMap.set(url, health);
  }

  const now = new Date().toISOString();
  if (success) {
    health.lastSuccess = now;
    health.consecutiveFailures = 0;
    if (articleDate && (!health.lastArticleDate || articleDate > health.lastArticleDate)) {
      health.lastArticleDate = articleDate;
    }
  } else {
    health.lastFailure = now;
    health.consecutiveFailures++;
  }
}

// RSS feeds — BBC/Guardian free feeds + NYT/WSJ/Economist/Reuters topic feeds
const FEEDS: RssFeed[] = [
  // BBC
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml" },
  // Guardian
  { name: "Guardian", url: "https://www.theguardian.com/world/rss" },
  { name: "Guardian", url: "https://www.theguardian.com/world/china/rss" },
  // NYT (public feeds)
  { name: "NYT", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  { name: "NYT", url: "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml" },
  { name: "NYT", url: "https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml" },
  // WSJ
  { name: "WSJ", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml" },
  { name: "WSJ", url: "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml" },
  // Economist
  { name: "Economist", url: "https://www.economist.com/china/rss.xml" },
  { name: "Economist", url: "https://www.economist.com/asia/rss.xml" },
  { name: "Economist", url: "https://www.economist.com/international/rss.xml" },
  // Reuters
  { name: "Reuters", url: "https://www.reutersagency.com/feed/?best-topics=china" },
];

// Keywords to filter RSS articles by title relevance (broadened)
const RELEVANCE_KEYWORDS = [
  // Core China terms
  "china", "chinese", "beijing", "xi jinping", "ccp", "prc",
  // Discourse keywords
  "modernization", "common prosperity", "belt and road", "bri",
  "development", "governance", "sovereignty",
  // Economic terms
  "trade war", "tariff", "supply chain", "dual circulation",
  "economic growth", "gdp", "yuan", "rmb",
  // Geopolitical
  "taiwan", "south china sea", "hong kong", "tibet", "xinjiang",
  "us-china", "sino-american", "diplomatic", "sanctions",
  // Technology
  "huawei", "tiktok", "semiconductor", "chip", "ai", "5g",
  // Broader context
  "global influence", "soft power", "developing world", "emerging market",
];

function isRelevant(title: string): boolean {
  const lower = title.toLowerCase();
  return RELEVANCE_KEYWORDS.some((kw) => lower.includes(kw));
}

function extractTag(content: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = content.match(re);
  if (!match) return null;
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function parseRssXml(xml: string): RssArticle[] {
  const items: RssArticle[] = [];

  // Detect format: Atom uses <entry>, RSS uses <item>
  const isAtom = xml.includes("<entry");

  if (isAtom) {
    // Atom feed parsing
    const entryBlocks = xml.split(/<entry[^>]*>/i).slice(1);
    for (const block of entryBlocks) {
      const endIdx = block.indexOf("</entry>");
      if (endIdx === -1) continue;
      const entryXml = block.slice(0, endIdx);

      const title = extractTag(entryXml, "title");
      // Atom links: <link href="..." rel="alternate"/> or <link href="..."/>
      const linkMatch = entryXml.match(/<link[^>]*href="([^"]*)"[^>]*(?:rel="alternate")?[^>]*\/?>/i)
        ?? entryXml.match(/<link[^>]*href="([^"]*)"/i);
      const link = linkMatch?.[1] ?? extractTag(entryXml, "link");
      const updated = extractTag(entryXml, "updated") ?? extractTag(entryXml, "published");
      const summary = extractTag(entryXml, "summary") ?? extractTag(entryXml, "content");

      if (title && link && isRelevant(title)) {
        items.push({
          title: decodeHtmlEntities(title),
          url: link,
          publish_date: updated ? parseDate(updated) : null,
          source: "",
          description: summary ? decodeHtmlEntities(summary).slice(0, 500) : null,
        });
      }
    }
  } else {
    // RSS feed parsing (<item>)
    const itemBlocks = xml.split(/<item[^>]*>/i).slice(1);
    for (const block of itemBlocks) {
      const endIdx = block.indexOf("</item>");
      if (endIdx === -1) continue;
      const itemXml = block.slice(0, endIdx);

      const title = extractTag(itemXml, "title");
      const link = extractTag(itemXml, "link");
      const pubDate = extractTag(itemXml, "pubDate");
      const description = extractTag(itemXml, "description");

      if (title && link && isRelevant(title)) {
        items.push({
          title: decodeHtmlEntities(title),
          url: link,
          publish_date: pubDate ? parseDate(pubDate) : null,
          source: "",
          description: description ? decodeHtmlEntities(description).slice(0, 500) : null,
        });
      }
    }
  }

  return items;
}

function parseDate(dateStr: string): string | null {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'");
}

export async function fetchRssArticles(): Promise<RssArticle[]> {
  const results: RssArticle[] = [];

  for (const feed of FEEDS) {
    // Skip feeds with 5+ consecutive failures (circuit breaker pattern)
    const health = feedHealthMap.get(feed.url);
    if (health && health.consecutiveFailures >= 5) {
      console.log(`[RSS] 跳过失效源 ${feed.name} (${feed.url}): 连续失败 ${health.consecutiveFailures} 次`);
      continue;
    }

    let success = false;
    let newestDate: string | null = null;

    // Retry up to 2 times on transient failures
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(feed.url, {
          headers: { "User-Agent": "OutSight/2.0 (Academic Research Tool)" },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          console.log(`[RSS] ${feed.name} HTTP ${res.status} (attempt ${attempt + 1})`);
          if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
          continue;
        }

        const xml = await res.text();
        const items = parseRssXml(xml);

        for (const item of items) {
          item.source = feed.name;
          results.push(item);
          if (item.publish_date && (!newestDate || item.publish_date > newestDate)) {
            newestDate = item.publish_date;
          }
        }

        success = true;
        console.log(`[RSS] ${feed.name}: ${items.length} 篇文章`);
        break;
      } catch (err) {
        console.log(`[RSS] ${feed.name} 请求失败 (attempt ${attempt + 1}): ${err instanceof Error ? err.message : err}`);
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
      }
    }

    updateFeedHealth(feed.url, feed.name, success, newestDate);
    if (!success) {
      console.log(`[RSS] ${feed.name} (${feed.url}): 采集失败`);
    }
  }

  // Log unhealthy feeds
  const unhealthy = Array.from(feedHealthMap.values()).filter((h) => h.consecutiveFailures >= 3);
  if (unhealthy.length > 0) {
    console.log(`[RSS] ⚠ 失效源 (${unhealthy.length}):`);
    for (const h of unhealthy) {
      console.log(`  - ${h.name} (${h.url}): 连续失败 ${h.consecutiveFailures} 次`);
    }
  }

  return results;
}
