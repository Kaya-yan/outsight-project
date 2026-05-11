import type { RssArticle } from "./rss-parser";
import { TIER_1_COMBOS, type KeywordCombo } from "./gdelt-keywords";

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

// Map UI research periods to GDELT timespan strings
const PERIOD_MAP: Record<string, string> = {
  "2022.10-2023.03": "20221001000000-20230331235959",
  "2023.04-2023.09": "20230401000000-20230930235959",
  "2023.10-2024.03": "20231001000000-20240331235959",
  "2024.04-2024.09": "20240401000000-20240930235959",
  "2024.10-2024.12": "20241001000000-20241231235959",
};

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

    const res = await fetch(url, {
      headers: { "User-Agent": "OutSight/1.0 (Academic Research Tool)" },
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) return [];

    const text = await res.text();
    if (!text || text.length < 10) return [];

    const json = JSON.parse(text);
    if (!json.articles || !Array.isArray(json.articles)) return [];

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
  } catch {
    return [];
  }
}

/**
 * Query GDELT for a single combo × outlet × the given timespan.
 * Returns articles with source and keyword_combo set.
 */
async function queryComboForOutlet(
  combo: KeywordCombo,
  outlet: { name: string; domains: string },
  timespan: string,
): Promise<RssArticle[]> {
  const query = `(${combo.query}) domain:${outlet.domains} sourcelang:eng`;
  const articles = await queryGdelt(query, timespan, 250);

  for (const a of articles) {
    a.source = outlet.name;
    a.keyword_combo = combo.label;
  }

  return articles;
}

export async function fetchGdeltArticles(period?: string): Promise<{
  source: string;
  articles: RssArticle[];
  debug?: Record<string, number>;
}> {
  const allArticles: RssArticle[] = [];
  const debugCounts: Record<string, number> = {};

  // Resolve period to a single GDELT timespan
  const timespan = period ? PERIOD_MAP[period] : undefined;
  if (!timespan) {
    // No valid period — return empty to avoid querying all periods at once
    return { source: "gdelt", articles: [], debug: { error: "no_period_selected" } };
  }

  // Use only Tier 1 combos — one period × 6 outlets × 10 combos = 60 queries max
  for (const combo of TIER_1_COMBOS) {
    for (const outlet of MEDIA_OUTLETS) {
      const articles = await queryComboForOutlet(combo, outlet, timespan);
      const key = `${outlet.name}_${combo.label}`;
      debugCounts[key] = articles.length;
      allArticles.push(...articles);

      // Rate limit: 3000ms between queries to avoid throttling
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  // Dedup within GDELT results by normalized URL
  const seen = new Set<string>();
  const unique: RssArticle[] = [];
  for (const a of allArticles) {
    const key = a.url.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(a);
    }
  }

  return { source: "gdelt", articles: unique, debug: debugCounts };
}
