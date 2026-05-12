import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createArticle } from "@/lib/data-access/articles";
import { discoverArticles } from "@/lib/search-engine-client";
import { expandSearchQueries, type KeywordTier } from "@/lib/keyword-expander";
import { batchGuardCheck } from "@/lib/insert-guard";

/**
 * POST /api/search/discover
 *
 * Standalone search engine discovery endpoint.
 * Accepts optional media, tier, and engine filters.
 * Runs search → guard → insert, and returns full statistics.
 *
 * Body (all optional):
 * {
 *   media?: string[],           // default: all 6
 *   tiers?: KeywordTier[],      // default: ["tier1_core"]
 *   engine?: "google" | "bing" | "both",  // default: "both"
 * }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  // Parse optional parameters
  let media: string[];
  let tiers: KeywordTier[];
  let engine: "google" | "bing" | "both" = "both";

  try {
    const body = await request.json().catch(() => ({}));
    media = body.media ?? ["NYT", "WP", "WSJ", "Guardian", "Economist", "BBC"];
    tiers = body.tiers ?? ["tier1_core"];
    engine = body.engine ?? "both";
  } catch {
    media = ["BBC"];
    tiers = ["tier1_core"];
  }

  console.log(`[Search/Discover] Starting: tiers=${tiers.join(",")}, media=${media.join(",")}, engine=${engine}`);

  // Step 1: Generate search queries
  const queries = expandSearchQueries(tiers, media);
  console.log(`[Search/Discover] ${queries.length} queries generated`);

  // Step 2: Run search engine discovery
  let searchResults: Awaited<ReturnType<typeof discoverArticles>>;
  try {
    searchResults = await discoverArticles({ queries, engine, maxPerQuery: 10 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Search/Discover] Search failed:`, msg);
    return NextResponse.json({ error: `搜索引擎发现失败: ${msg}` }, { status: 500 });
  }

  console.log(`[Search/Discover] ${searchResults.length} unique articles found`);

  if (searchResults.length === 0) {
    return NextResponse.json({
      success: true,
      found: 0,
      inserted: 0,
      filterStats: null,
      message: "搜索引擎未发现新文章（可能没有配置API Key或所有结果均已被收录）",
    });
  }

  // Step 3: Guard check (time filter + dedup)
  const articles = searchResults.map((r) => ({
    title: r.title,
    publish_date: r.publish_date,
    url: r.url,
  }));

  const { passed, stats } = await batchGuardCheck(supabase, articles);

  console.log(`[Search/Discover] Guard: ${stats.passed}/${stats.total} passed`);

  // Step 4: Insert passed articles
  let insertedCount = 0;
  const toInsert = passed.filter((g) => g.guard.passed);

  for (const { article, guard } of toInsert) {
    const original = searchResults.find((r) => r.url === article.url);
    const { error } = await createArticle(supabase, {
      title: article.title ?? original?.title ?? "Untitled",
      url: article.url,
      media: original?.source ?? "未知",
      source: original?.source ?? "未知",
      publish_date: article.publish_date ?? undefined,
      status: "已入库",
      abstract: original?.snippet ?? undefined,
      content: "",
      full_text_status: "missing",
      url_hash: guard.urlHash,
      keyword_combo: original ? [`${original.keyword} (${original.tier})`] : undefined,
      created_by: user.id,
    });

    if (!error) insertedCount++;
  }

  console.log(`[Search/Discover] Inserted: ${insertedCount}/${toInsert.length}`);

  return NextResponse.json({
    success: true,
    found: searchResults.length,
    inserted: insertedCount,
    filterStats: {
      total: stats.total,
      passed: stats.passed,
      filtered: stats.filtered,
      detailSample: stats.details.slice(0, 10),
    },
    message: `搜索引擎发现 ${searchResults.length} 篇文章，入库 ${insertedCount} 篇`,
  });
}
