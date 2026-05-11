import type { RssArticle } from "./rss-parser";

const NEWSAPI_BASE = "https://newsapi.org/v2";
const KEYWORD = "China modernization";

// 6 media outlets mapped to their domains
const MEDIA_DOMAINS: Record<string, string> = {
  NYT: "nytimes.com",
  WP: "washingtonpost.com",
  WSJ: "wsj.com",
  Guardian: "theguardian.com",
  Economist: "economist.com",
  BBC: "bbc.com,bbc.co.uk",
};

function mapSource(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("new york times") || n.includes("nytimes")) return "NYT";
  if (n.includes("washington post")) return "WP";
  if (n.includes("wall street journal") || n.includes("wsj")) return "WSJ";
  if (n.includes("guardian")) return "Guardian";
  if (n.includes("economist")) return "Economist";
  if (n.includes("bbc")) return "BBC";
  return "";
}

export async function fetchNewsApiArticles(): Promise<RssArticle[]> {
  // Try both env var names
  const apiKey = process.env.NEWS_API_KEY || process.env.NEWSAPI_KEY;
  if (!apiKey) return [];

  const results: RssArticle[] = [];

  // One query with all domains
  const allDomains = Object.values(MEDIA_DOMAINS).join(",");

  try {
    const params = new URLSearchParams({
      q: KEYWORD,
      apiKey,
      language: "en",
      sortBy: "publishedAt",
      pageSize: "50",
      domains: allDomains,
    });

    const res = await fetch(`${NEWSAPI_BASE}/everything?${params}`, {
      headers: { "User-Agent": "OutSight/1.0 (Academic Research Tool)" },
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.status === "ok" && json.articles) {
        for (const a of json.articles) {
          if (!a.title || !a.url) continue;
          const source = mapSource(a.source?.name ?? "");
          if (!source) continue; // skip if not from our 6 media
          results.push({
            title: a.title,
            url: a.url,
            publish_date: a.publishedAt
              ? new Date(a.publishedAt).toISOString().split("T")[0]
              : null,
            source,
            description: a.description?.slice(0, 500) ?? null,
          });
        }
      }
    }
  } catch {
    // Skip failed request
  }

  return results;
}
