/**
 * Serper.dev Search Client
 *
 * Fallback search engine when Bing Search API is not configured or fails.
 * Serper.dev is a Google Search API wrapper with a generous free tier (2500 queries/month).
 *
 * API: POST https://google.serper.dev/search
 * Auth: X-API-KEY header
 * Env:  SERPER_API_KEY
 *
 * Uses Google's tbs (time-based search) parameter to restrict results
 * to the research period (2022-10-01 to 2025-12-31).
 */

import type { SearchQuery } from "./keyword-expander";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publish_date: string | null;
  source: string;
  keyword: string;
  tier: string;
}

const SERPER_BASE = "https://google.serper.dev/search";

/**
 * Search Serper.dev for articles matching the given query.
 * Returns empty array if SERPER_API_KEY is not configured or request fails.
 */
export async function searchSerper(
  query: SearchQuery,
  maxResults = 10,
): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return [];
  }

  const q = `site:${query.site} ${query.query}`;

  try {
    const res = await fetch(SERPER_BASE, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q,
        num: Math.min(maxResults, 25),
        // tbs: cdr:1 = custom date range, cd_min/cd_max in MM/DD/YYYY
        tbs: "cdr:1,cd_min:10/1/2022,cd_max:12/31/2025",
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.log(
        `[SearchEngine/Serper] HTTP ${res.status} for: ${q.slice(0, 80)}`,
      );
      return [];
    }

    const json = await res.json();
    const organic = json.organic;
    if (!organic || !Array.isArray(organic)) {
      console.log(
        `[SearchEngine/Serper] 0 results (no organic) for: ${q.slice(0, 80)}`,
      );
      return [];
    }

    console.log(
      `[SearchEngine/Serper] ${organic.length} results for: ${q.slice(0, 80)}`,
    );

    return organic
      .filter(
        (item: Record<string, unknown>) =>
          item.title &&
          item.link &&
          typeof item.link === "string" &&
          item.link.startsWith("http"),
      )
      .map((item: Record<string, unknown>) => ({
        title: String(item.title ?? ""),
        url: String(item.link ?? ""),
        snippet: String(item.snippet ?? "").slice(0, 500),
        publish_date: extractSerperDate(item),
        source: query.media,
        keyword: query.keyword,
        tier: query.tier,
      }));
  } catch (err) {
    console.log(
      `[SearchEngine/Serper] Error: ${err instanceof Error ? err.message : err}`,
    );
    return [];
  }
}

function extractSerperDate(item: Record<string, unknown>): string | null {
  const raw = item.date as string | undefined;
  if (!raw) return null;
  try {
    return new Date(raw).toISOString().split("T")[0];
  } catch {
    return null;
  }
}
