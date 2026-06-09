import type { RssArticle } from "./rss-parser";

const NEWSAPI_BASE = "https://newsapi.org/v2";

// Keyword rotation pool — each query returns up to 100 results (free tier max).
// Rotating keywords broadens coverage beyond a single phrase.
const KEYWORDS = [
  "China modernization",
  "China development",
  "China Belt and Road",
  "China economy",
  "China foreign policy",
  "China technology",
  "China governance",
  "China trade",
  "China global influence",
  "China climate",
];

// Round-robin index persisted across calls within the same process
let keywordIndex = 0;

function nextKeyword(): string {
  const kw = KEYWORDS[keywordIndex % KEYWORDS.length];
  keywordIndex++;
  return kw;
}

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
  const seenUrls = new Set<string>();

  // One query with all domains
  const allDomains = Object.values(MEDIA_DOMAINS).join(",");

  // Rotate through 3 keywords per call to broaden coverage
  const QUERIES_PER_CALL = 3;

  for (let i = 0; i < QUERIES_PER_CALL; i++) {
    const keyword = nextKeyword();

    try {
      const params = new URLSearchParams({
        q: keyword,
        apiKey,
        language: "en",
        sortBy: "publishedAt",
        pageSize: "100",
        domains: allDomains,
      });

      const res = await fetch(`${NEWSAPI_BASE}/everything?${params}`, {
        headers: { "User-Agent": "OutSight/2.0 (Academic Research Tool)" },
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === "ok" && json.articles) {
          for (const a of json.articles) {
            if (!a.title || !a.url) continue;
            if (seenUrls.has(a.url)) continue;
            const source = mapSource(a.source?.name ?? "");
            if (!source) continue;
            seenUrls.add(a.url);
            results.push({
              title: a.title,
              url: a.url,
              publish_date: a.publishedAt
                ? new Date(a.publishedAt).toISOString().split("T")[0]
                : null,
              source,
              description: a.description?.slice(0, 500) ?? null,
              keyword_combo: keyword,
            });
          }
        }
      }
    } catch {
      // Skip failed request
    }

    // Rate limit between queries
    if (i < QUERIES_PER_CALL - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return results;
}
