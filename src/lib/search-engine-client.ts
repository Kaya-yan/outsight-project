/**
 * Search Engine Discovery Client
 *
 * Supports Google Custom Search JSON API and Bing Web Search API v7.
 * Both engines use site:{domain} operator to restrict searches to target media outlets.
 * No API key → silently skipped (returns empty array).
 *
 * Environment variables:
 *   GOOGLE_SEARCH_API_KEY     — Google Custom Search JSON API key
 *   GOOGLE_SEARCH_ENGINE_ID   — Google Programmable Search Engine ID (cx)
 *   BING_SEARCH_API_KEY       — Bing Web Search API v7 key (Azure Marketplace)
 */

import type { SearchQuery } from "./keyword-expander";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publish_date: string | null;
  source: string;
  keyword: string;
  tier: string;
}

// ============================================================
// Google Custom Search
// ============================================================

const GOOGLE_CSE_BASE = "https://www.googleapis.com/customsearch/v1";

async function searchGoogle(
  query: SearchQuery,
  maxResults = 10,
): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (!apiKey || !engineId) return [];

  const q = `site:${query.site} ${query.query}`;

  const params = new URLSearchParams({
    key: apiKey,
    cx: engineId,
    q,
    num: String(Math.min(maxResults, 10)),
    // dateRestrict: d730 = last 2 years (covers 2024-2025; older results also returned without strict cutoff)
    dateRestrict: "d730",
  });

  try {
    const res = await fetch(`${GOOGLE_CSE_BASE}?${params}`, {
      headers: { "User-Agent": "OutSight/2.0 (Academic Research Tool)" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.log(`[SearchEngine/Google] HTTP ${res.status} for: ${q.slice(0, 80)}`);
      return [];
    }

    const json = await res.json();
    if (!json.items || !Array.isArray(json.items)) return [];

    console.log(`[SearchEngine/Google] ${json.items.length} results for: ${q.slice(0, 80)}`);

    return json.items
      .filter(
        (item: Record<string, unknown>) =>
          item.title && item.link && typeof item.link === "string" && item.link.startsWith("http"),
      )
      .map((item: Record<string, unknown>) => ({
        title: String(item.title ?? ""),
        url: String(item.link ?? ""),
        snippet: String(item.snippet ?? "").slice(0, 500),
        publish_date: extractGoogleDate(item),
        source: query.media,
        keyword: query.keyword,
        tier: query.tier,
      }));
  } catch (err) {
    console.log(`[SearchEngine/Google] Error: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

function extractGoogleDate(item: Record<string, unknown>): string | null {
  // Try pagemap metatags first
  const pagemap = item.pagemap as Record<string, unknown> | undefined;
  if (pagemap) {
    // metatags → article:published_time
    const metatags = pagemap.metatags as Array<Record<string, string>> | undefined;
    if (metatags && metatags.length > 0) {
      const meta = metatags[0];
      const d = meta["article:published_time"] || meta["og:article:published_time"] || meta["date"];
      if (d) {
        try {
          return new Date(d).toISOString().split("T")[0];
        } catch { /* fall through */ }
      }
    }
    // newsarticle → datepublished
    const newsArticles = pagemap.newsarticle as Array<Record<string, string>> | undefined;
    if (newsArticles && newsArticles.length > 0) {
      const d = newsArticles[0].datepublished;
      if (d) {
        try {
          return new Date(d).toISOString().split("T")[0];
        } catch { /* fall through */ }
      }
    }
  }
  return null;
}

// ============================================================
// Bing Web Search
// ============================================================

const BING_SEARCH_BASE = "https://api.bing.microsoft.com/v7.0/search";

async function searchBing(
  query: SearchQuery,
  maxResults = 10,
): Promise<SearchResult[]> {
  const apiKey = process.env.BING_SEARCH_API_KEY;
  if (!apiKey) return [];

  const q = `site:${query.site} ${query.query}`;

  const params = new URLSearchParams({
    q,
    count: String(Math.min(maxResults, 50)),
    mkt: "en-US",
    freshness: "Month", // Bing-specific: last month; for historical we accept broader results
  });

  try {
    const res = await fetch(`${BING_SEARCH_BASE}?${params}`, {
      headers: {
        "User-Agent": "OutSight/2.0 (Academic Research Tool)",
        "Ocp-Apim-Subscription-Key": apiKey,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.log(`[SearchEngine/Bing] HTTP ${res.status} for: ${q.slice(0, 80)}`);
      return [];
    }

    const json = await res.json();
    const pages = json.webPages?.value;
    if (!pages || !Array.isArray(pages)) return [];

    console.log(`[SearchEngine/Bing] ${pages.length} results for: ${q.slice(0, 80)}`);

    return pages
      .filter(
        (p: Record<string, unknown>) =>
          p.name && p.url && typeof p.url === "string" && p.url.startsWith("http"),
      )
      .map((p: Record<string, unknown>) => ({
        title: String(p.name ?? ""),
        url: String(p.url ?? ""),
        snippet: String(p.snippet ?? "").slice(0, 500),
        publish_date: p.dateLastCrawled
          ? new Date(String(p.dateLastCrawled)).toISOString().split("T")[0]
          : null,
        source: query.media,
        keyword: query.keyword,
        tier: query.tier,
      }));
  } catch (err) {
    console.log(`[SearchEngine/Bing] Error: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

// ============================================================
// Unified interface
// ============================================================

export interface DiscoverOptions {
  queries: SearchQuery[];
  /** Which engine(s) to use. Default: tries both, returns results from any that have API keys configured. */
  engine?: "google" | "bing" | "both";
  maxPerQuery?: number;
}

export async function discoverArticles(opts: DiscoverOptions): Promise<SearchResult[]> {
  const { queries, engine = "both", maxPerQuery = 10 } = opts;
  const allResults: SearchResult[] = [];

  console.log(`[SearchEngine] Starting discovery: ${queries.length} queries, engine=${engine}`);

  let i = 0;
  for (const q of queries) {
    i++;
    console.log(`[SearchEngine] [${i}/${queries.length}] "${q.keyword}" site:${q.site} (${q.tier})`);

    const googlePromise = (engine === "google" || engine === "both")
      ? searchGoogle(q, maxPerQuery)
      : Promise.resolve([] as SearchResult[]);

    const bingPromise = (engine === "bing" || engine === "both")
      ? searchBing(q, maxPerQuery)
      : Promise.resolve([] as SearchResult[]);

    const [googleResults, bingResults] = await Promise.all([googlePromise, bingPromise]);

    // Merge and dedup by URL within this query batch
    const seen = new Set<string>();
    for (const r of [...googleResults, ...bingResults]) {
      const key = r.url.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        allResults.push(r);
      }
    }

    // Rate limit: 1s between queries for free tier APIs
    if (i < queries.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`[SearchEngine] Discovery complete: ${allResults.length} unique articles found`);
  return allResults;
}
