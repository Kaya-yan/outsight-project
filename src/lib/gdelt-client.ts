import type { RssArticle } from "./rss-parser";

const GDELT_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

// Each media outlet with its domain(s)
const MEDIA_OUTLETS = [
  { name: "NYT", domains: "nytimes.com" },
  { name: "WP", domains: "washingtonpost.com" },
  { name: "WSJ", domains: "wsj.com" },
  { name: "Guardian", domains: "theguardian.com" },
  { name: "Economist", domains: "economist.com" },
  { name: "BBC", domains: "bbc.com OR bbc.co.uk" },
];

// Broader keyword combinations for searching China-related discourse
const KEYWORD_COMBOS = [
  '"China"',
  '"Chinese"',
  '"China" economic',
  '"China" development',
  '"China" foreign policy',
  '"China" modernization',
  '"China" "Belt and Road"',
  '"China" "common prosperity"',
  '"Xi Jinping"',
];

// Year ranges
const YEAR_RANGES = [
  { label: "2022H1", timespan: "20220101000000-20220630235959" },
  { label: "2022H2", timespan: "20220701000000-20221231235959" },
  { label: "2023H1", timespan: "20230101000000-20230630235959" },
  { label: "2023H2", timespan: "20230701000000-20231231235959" },
  { label: "2024H1", timespan: "20240101000000-20240630235959" },
  { label: "2024H2", timespan: "20240701000000-20241231235959" },
];

async function queryGdelt(
  query: string,
  timespan: string,
  maxRecords = 250,
): Promise<RssArticle[]> {
  const params = new URLSearchParams({
    query,
    mode: "artlist",
    format: "json",
    maxrecords: String(maxRecords),
    timespan,
    sort: "datedesc",
  });

  try {
    const url = `${GDELT_BASE}?${params}`;
    // GDELT query dispatched

    const res = await fetch(url, {
      headers: { "User-Agent": "OutSight/1.0 (Academic Research Tool)" },
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      // GDELT HTTP error
      return [];
    }

    const text = await res.text();
    if (!text || text.length < 10) return [];

    const json = JSON.parse(text);
    if (!json.articles || !Array.isArray(json.articles)) return [];

    // GDELT results received

    return json.articles
      .filter(
        (a: Record<string, unknown>) =>
          a.title && typeof a.title === "string" && a.title.length > 5 &&
          a.url && typeof a.url === "string" && a.url.startsWith("http"),
      )
      .map((a: Record<string, unknown>) => {
        const seendate = String(a.seendate ?? "");
        return {
          title: String(a.title),
          url: String(a.url),
          publish_date: seendate.length >= 8
            ? `${seendate.slice(0, 4)}-${seendate.slice(4, 6)}-${seendate.slice(6, 8)}`
            : null,
          source: "",
          description: null,
        };
      });
  } catch (err) {
    // GDELT fetch error
    return [];
  }
}

export async function fetchGdeltArticles(): Promise<{
  source: string;
  articles: RssArticle[];
  debug?: Record<string, number>;
}> {
  const allArticles: RssArticle[] = [];
  const debugCounts: Record<string, number> = {};

  // For each media outlet, try the first keyword combo
  // to avoid excessive API calls (6 outlets × 6 time periods × 1 keyword = 36 queries max)
  for (const outlet of MEDIA_OUTLETS) {
    const query = `(${KEYWORD_COMBOS[0]}) domain:${outlet.domains} sourcelang:eng`;
    const key = outlet.name;

    for (const range of YEAR_RANGES) {
      const articles = await queryGdelt(query, range.timespan, 250);
      const countKey = `${key}_${range.label}`;
      debugCounts[countKey] = articles.length;

      for (const a of articles) {
        a.source = outlet.name;
      }
      allArticles.push(...articles);

      // Small delay to avoid overwhelming the API
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // If first keyword combo yields poor results, try additional combos
  // for the outlets that got < 10 results total
  const byOutlet = new Map<string, number>();
  for (const a of allArticles) {
    byOutlet.set(a.source, (byOutlet.get(a.source) ?? 0) + 1);
  }

  const weakOutlets = MEDIA_OUTLETS.filter(
    (o) => (byOutlet.get(o.name) ?? 0) < 10,
  );

  if (weakOutlets.length > 0) {
    for (const outlet of weakOutlets) {
      // Try keyword combo index 1 (different keyword)
      const query = `(${KEYWORD_COMBOS[1]}) domain:${outlet.domains} sourcelang:eng`;

      for (const range of YEAR_RANGES) {
        const articles = await queryGdelt(query, range.timespan, 250);
        const countKey = `${outlet.name}_${range.label}_k2`;
        debugCounts[countKey] = articles.length;

        for (const a of articles) {
          a.source = outlet.name;
        }
        allArticles.push(...articles);
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }

  // Dedup within GDELT results
  const seen = new Set<string>();
  const unique: RssArticle[] = [];
  for (const a of allArticles) {
    const key = a.url.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(a);
    }
  }

  // GDELT dedup complete

  return { source: "gdelt", articles: unique, debug: debugCounts };
}
