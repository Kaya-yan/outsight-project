/**
 * Search Engine Discovery Client — Multi-Engine Redundant Architecture
 *
 * Priority chain: Bing Search → Serper.dev → Google CSE
 * Each engine is tried in sequence; the first that returns results wins.
 * If all engines fail or are unconfigured, returns empty array.
 * RSS/NewsAPI/GDELT always run independently regardless of search engine outcome.
 *
 * Environment variables:
 *   BING_SEARCH_API_KEY       — Bing Web Search API v7 key (Azure Marketplace)
 *   SERPER_API_KEY            — Serper.dev Google Search API key
 *   GOOGLE_SEARCH_API_KEY     — Google Custom Search JSON API key
 *   GOOGLE_SEARCH_ENGINE_ID   — Google Programmable Search Engine ID (cx)
 */

import type { SearchQuery } from "./keyword-expander";
import { searchSerper } from "./serper-client";

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
// Unified interface — Multi-engine with priority fallback chain
// ============================================================

export type SearchEngine = "google" | "bing" | "serper" | "both" | "auto" | "all";

export interface DiscoverOptions {
  queries: SearchQuery[];
  /**
   * Engine selection:
   *   "bing"   — Bing only
   *   "serper" — Serper.dev only
   *   "google" — Google CSE only
   *   "both"   — Bing + Google in parallel (legacy)
   *   "auto"   — Bing → Serper → Google sequential fallback (default)
   *   "all"    — All three in parallel
   */
  engine?: SearchEngine;
  maxPerQuery?: number;
}

export interface EngineUsageStats {
  /** Which engines were actually used (had API keys configured and returned results) */
  enginesUsed: string[];
  /** Per-engine result counts */
  engineResults: Record<string, number>;
  /** Total queries executed */
  totalQueries: number;
  /** Queries that returned at least 1 result */
  productiveQueries: number;
}

export async function discoverArticles(opts: DiscoverOptions): Promise<{
  results: SearchResult[];
  engineStats: EngineUsageStats;
}> {
  const { queries, engine = "auto", maxPerQuery = 10 } = opts;
  const allResults: SearchResult[] = [];

  // Track per-engine statistics
  const engineHits: Record<string, number> = {};
  const enginesUsed = new Set<string>();
  let productiveQueries = 0;

  console.log(`[SearchEngine] Starting discovery: ${queries.length} queries, mode=${engine}`);

  const hasBing = !!process.env.BING_SEARCH_API_KEY;
  const hasSerper = !!process.env.SERPER_API_KEY;
  const hasGoogle = !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID);

  console.log(
    `[SearchEngine] API keys: Bing=${hasBing}, Serper=${hasSerper}, Google=${hasGoogle}`,
  );

  let i = 0;
  for (const q of queries) {
    i++;
    const qLabel = `"${q.keyword}" site:${q.site} (${q.tier})`;
    console.log(`[SearchEngine] [${i}/${queries.length}] ${qLabel}`);

    let queryResults: SearchResult[] = [];
    let usedEngine = "none";

    // Determine which engines to try based on mode
    if (engine === "auto") {
      // Priority fallback chain: Bing → Serper → Google
      if (hasBing) {
        queryResults = await searchBing(q, maxPerQuery);
        if (queryResults.length > 0) {
          usedEngine = "bing";
        }
      }

      if (queryResults.length === 0 && hasSerper) {
        queryResults = await searchSerper(q, maxPerQuery);
        if (queryResults.length > 0) {
          usedEngine = "serper";
        }
      }

      if (queryResults.length === 0 && hasGoogle) {
        queryResults = await searchGoogle(q, maxPerQuery);
        if (queryResults.length > 0) {
          usedEngine = "google";
        }
      }
    } else if (engine === "bing") {
      queryResults = await searchBing(q, maxPerQuery);
      usedEngine = queryResults.length > 0 ? "bing" : "none";
    } else if (engine === "serper") {
      queryResults = await searchSerper(q, maxPerQuery);
      usedEngine = queryResults.length > 0 ? "serper" : "none";
    } else if (engine === "google") {
      queryResults = await searchGoogle(q, maxPerQuery);
      usedEngine = queryResults.length > 0 ? "google" : "none";
    } else if (engine === "both") {
      // Legacy: Bing + Google in parallel
      const [bingRes, googleRes] = await Promise.all([
        hasBing ? searchBing(q, maxPerQuery) : [],
        hasGoogle ? searchGoogle(q, maxPerQuery) : [],
      ]);
      queryResults = dedupByUrl([...bingRes, ...googleRes]);
      if (bingRes.length > 0) usedEngine = "bing";
      if (googleRes.length > 0) usedEngine = usedEngine === "none" ? "google" : `${usedEngine}+google`;
    } else if (engine === "all") {
      // All three in parallel
      const [bingRes, serperRes, googleRes] = await Promise.all([
        hasBing ? searchBing(q, maxPerQuery) : [],
        hasSerper ? searchSerper(q, maxPerQuery) : [],
        hasGoogle ? searchGoogle(q, maxPerQuery) : [],
      ]);
      queryResults = dedupByUrl([...bingRes, ...serperRes, ...googleRes]);
      const parts: string[] = [];
      if (bingRes.length > 0) parts.push("bing");
      if (serperRes.length > 0) parts.push("serper");
      if (googleRes.length > 0) parts.push("google");
      usedEngine = parts.length > 0 ? parts.join("+") : "none";
    }

    // Track engine usage
    if (usedEngine !== "none") {
      enginesUsed.add(usedEngine);
      engineHits[usedEngine] = (engineHits[usedEngine] ?? 0) + queryResults.length;
      if (queryResults.length > 0) productiveQueries++;
    }

    console.log(
      `[SearchEngine] [${i}/${queries.length}] engine=${usedEngine}, returned=${queryResults.length}`,
    );

    allResults.push(...queryResults);

    // Rate limit: 1s between queries
    if (i < queries.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Build engine results map
  const engineResults: Record<string, number> = {};
  for (const eng of Array.from(enginesUsed)) {
    engineResults[eng] = engineHits[eng] ?? 0;
  }

  const engineStats: EngineUsageStats = {
    enginesUsed: Array.from(enginesUsed),
    engineResults,
    totalQueries: queries.length,
    productiveQueries,
  };

  console.log(`[SearchEngine] ========== 搜索完成 ==========`);
  console.log(`[SearchEngine] 查询数: ${queries.length}`);
  console.log(`[SearchEngine] 有效查询: ${productiveQueries} (返回至少1条结果)`);
  console.log(`[SearchEngine] 使用引擎: ${enginesUsed.size > 0 ? Array.from(enginesUsed).join(", ") : "无 (所有引擎均未配置或失败)"}`);
  for (const [eng, count] of Object.entries(engineResults)) {
    console.log(`[SearchEngine]   ${eng}: ${count} 条`);
  }
  console.log(`[SearchEngine] 去重后总计: ${allResults.length} 篇`);
  console.log(`[SearchEngine] =================================`);

  return { results: allResults, engineStats };
}

function dedupByUrl(articles: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return articles.filter((r) => {
    const key = r.url.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
