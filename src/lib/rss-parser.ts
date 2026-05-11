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

// BBC and Guardian have free RSS feeds
const FEEDS: RssFeed[] = [
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "BBC", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { name: "Guardian", url: "https://www.theguardian.com/world/rss" },
];

// Keywords to filter RSS articles by title relevance
const RELEVANCE_KEYWORDS = [
  "china", "chinese", "beijing", "xi jinping", "modernization",
  "common prosperity", "belt and road", "bri", "development",
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
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "OutSight/1.0 (Academic Research Tool)" },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) continue;

      const xml = await res.text();
      const items = parseRssXml(xml);

      for (const item of items) {
        item.source = feed.name;
        results.push(item);
      }
    } catch {
      // Skip failed feeds
    }
  }

  return results;
}
