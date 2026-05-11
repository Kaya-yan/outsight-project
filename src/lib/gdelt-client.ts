import type { RssArticle } from "./rss-parser";
import { TIER_1_COMBOS, TIER_2_COMBOS, type KeywordCombo } from "./gdelt-keywords";

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
 * Query GDELT for a single combo × outlet × all periods.
 * Returns articles with source and keyword_combo set.
 */
async function queryComboForOutlet(
  combo: KeywordCombo,
  outlet: { name: string; domains: string },
  periods: typeof YEAR_RANGES,
): Promise<RssArticle[]> {
  const query = `(${combo.query}) domain:${outlet.domains} sourcelang:eng`;
  const results: RssArticle[] = [];

  for (const range of periods) {
    const articles = await queryGdelt(query, range.timespan, 250);
    for (const a of articles) {
      a.source = outlet.name;
      a.keyword_combo = combo.label;
    }
    results.push(...articles);
    // Rate limit: 200ms between queries
    await new Promise((r) => setTimeout(r, 200));
  }

  return results;
}

export async function fetchGdeltArticles(): Promise<{
  source: string;
  articles: RssArticle[];
  debug?: Record<string, number>;
}> {
  const allArticles: RssArticle[] = [];
  const debugCounts: Record<string, number> = {};

  // ============================================================
  // Round 1: Tier 1 combos × all outlets × all periods
  // ============================================================

  // Track per-outlet yield across all Tier 1 combos
  const perOutlet = new Map<string, number>();

  for (const combo of TIER_1_COMBOS) {
    for (const outlet of MEDIA_OUTLETS) {
      const articles = await queryComboForOutlet(combo, outlet, YEAR_RANGES);
      const key = `${outlet.name}_${combo.label}`;
      debugCounts[key] = articles.length;

      allArticles.push(...articles);
      perOutlet.set(outlet.name, (perOutlet.get(outlet.name) ?? 0) + articles.length);
    }
  }

  // ============================================================
  // Round 2: Tier 2 combos for weak outlets (recent 2 periods only)
  // ============================================================

  const recentPeriods = YEAR_RANGES.slice(-2); // 2024H1, 2024H2
  const weakOutlets = MEDIA_OUTLETS.filter(
    (o) => (perOutlet.get(o.name) ?? 0) < 10,
  );

  if (weakOutlets.length > 0) {
    for (const combo of TIER_2_COMBOS) {
      for (const outlet of weakOutlets) {
        const articles = await queryComboForOutlet(combo, outlet, recentPeriods);
        const key = `${outlet.name}_${combo.label}_t2`;
        debugCounts[key] = articles.length;
        allArticles.push(...articles);
      }
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
