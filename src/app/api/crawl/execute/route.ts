import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createArticle } from "@/lib/data-access/articles";
import { updateCrawlJob } from "@/lib/data-access/crawl-jobs";
import { fetchRssArticles } from "@/lib/rss-parser";
import { fetchNewsApiArticles } from "@/lib/newsapi-client";
import { batchGuardCheck } from "@/lib/insert-guard";
import { discoverArticles } from "@/lib/search-engine-client";
import { expandSearchQueries, type KeywordTier } from "@/lib/keyword-expander";
import { TIER_1_COMBOS } from "@/lib/gdelt-keywords";

// ============================================================
// Hard-coded scope for stability testing
// ============================================================
const OUTLET = { name: "BBC", domains: "bbc.com OR bbc.co.uk" };
const TIMESPAN = "20240701000000-20241231235959"; // 2024H2 only
const GDELT_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

async function queryGdeltBbc(query: string) {
  const params = new URLSearchParams({
    query: `(${query}) domain:${OUTLET.domains} sourcelang:eng`,
    mode: "artlist",
    format: "json",
    maxrecords: "250",
    timespan: TIMESPAN,
    sort: "datedesc",
  });

  const res = await fetch(`${GDELT_BASE}?${params}`, {
    headers: { "User-Agent": "OutSight/1.0 (Academic Research Tool)" },
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    console.log(`[Crawl] GDELT HTTP ${res.status} for query: ${query}`);
    return [];
  }

  const text = await res.text();
  if (!text || text.length < 10) return [];

  const json = JSON.parse(text);
  if (!json.articles || !Array.isArray(json.articles)) return [];

  console.log(`[Crawl] GDELT 返回 ${json.articles.length} 条: "${query}"`);
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
        source: "BBC",
        description: null,
        keyword_combo: query,
      };
    });
}

export async function POST(request: Request) {
  let jobId: string | null = null;
  const supabase = await createClient();

  try {
    const body = await request.json();
    jobId = body.job_id;
  } catch {
    return NextResponse.json({ error: "缺少 job_id" }, { status: 400 });
  }

  console.log(`[Crawl] ========================================`);
  console.log(`[Crawl] 后台采集开始: ${jobId}`);
  console.log(`[Crawl] 范围: BBC / 2024H2 / 仅元数据`);
  console.log(`[Crawl] ========================================`);

  // Mark job as running
  await updateCrawlJob(supabase, jobId, {
    status: "running",
    progress: 0,
  });

  const allArticles: Array<{
    title: string;
    url: string;
    publish_date: string | null;
    source: string;
    description: string | null;
    keyword_combo?: string;
  }> = [];

  // Accumulator variables declared at outer scope so the final
  // return statement can always reference them safely.
  let insertedCount = 0;
  let sourceStats = { rss: 0, newsapi: 0, gdelt: 0, search: 0 };
  let totalGuardStats = {
    total: 0,
    passed: 0,
    filtered: {} as Record<string, number>,
    details: [] as Array<{ url: string; title?: string; reason: string; detail: string }>,
  };
  let searchEngineStats: Record<string, unknown> | null = null;
  let searchResultCount = 0;

  try {
    // ============================================================
    // Source 1: RSS (BBC feeds only)
    // ============================================================
    console.log(`[Crawl] 开始请求 RSS (BBC)...`);
    let rssArticles: Awaited<ReturnType<typeof fetchRssArticles>> = [];
    try {
      rssArticles = await fetchRssArticles();
      const bbcRss = rssArticles.filter((a) => a.source === "BBC");
      console.log(`[Crawl] RSS: ${bbcRss.length} 篇 BBC 文章`);
      allArticles.push(...bbcRss);
    } catch (err) {
      console.log(`[Crawl] RSS 请求失败: ${err instanceof Error ? err.message : err}`);
    }

    // ============================================================
    // Source 2: NewsAPI (BBC only)
    // ============================================================
    console.log(`[Crawl] 开始请求 NewsAPI...`);
    let newsApiArticles: Awaited<ReturnType<typeof fetchNewsApiArticles>> = [];
    try {
      newsApiArticles = await fetchNewsApiArticles();
      const bbcNewsApi = newsApiArticles.filter((a) => a.source === "BBC");
      console.log(`[Crawl] NewsAPI: ${bbcNewsApi.length} 篇 BBC 文章`);
      allArticles.push(...bbcNewsApi);
    } catch (err) {
      console.log(`[Crawl] NewsAPI 请求失败: ${err instanceof Error ? err.message : err}`);
    }

    // ============================================================
    // Source 3: GDELT (BBC + 2024H2 + Tier 1 combos)
    // ============================================================
    console.log(`[Crawl] 开始请求 GDELT (${TIER_1_COMBOS.length} 个关键词组合)...`);
    const totalCombos = TIER_1_COMBOS.length;

    for (let i = 0; i < TIER_1_COMBOS.length; i++) {
      const combo = TIER_1_COMBOS[i];
      console.log(`[Crawl] GDELT [${i + 1}/${totalCombos}] "${combo.label}"...`);

      let gdeltArticles: Array<{
        title: string;
        url: string;
        publish_date: string | null;
        source: string;
        description: string | null;
        keyword_combo?: string;
      }> = [];

      try {
        gdeltArticles = await queryGdeltBbc(combo.query);
      } catch (err) {
        console.log(`[Crawl] GDELT 查询失败: ${err instanceof Error ? err.message : err}`);
      }

      allArticles.push(...gdeltArticles);

      // Update progress: 5% for RSS+NewsAPI, 90% for GDELT combos
      const progress = 5 + Math.round(((i + 1) / totalCombos) * 90);
      await updateCrawlJob(supabase, jobId, {
        progress,
        total_fetched: allArticles.length,
      });
      console.log(`[Crawl] 当前已完成 ${allArticles.length} 篇 (进度 ${progress}%)`);

      // Rate limit: 3000ms
      if (i < TIER_1_COMBOS.length - 1) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    // ============================================================
    // Source 4: Search Engine Discovery (Bing → Serper → Google)
    // ============================================================
    console.log(`[Crawl] 开始搜索引擎发现...`);
    const searchTiers: KeywordTier[] = ["tier1_core", "tier2_policy"];
    const searchMedia = ["BBC"]; // currently hard-coded; extend to all 6 later
    const searchQueries = expandSearchQueries(searchTiers, searchMedia);
    console.log(`[Crawl] 搜索层: ${searchQueries.length} 个查询 (${searchTiers.join(", ")} × ${searchMedia.join(", ")})`);

    try {
      const { results, engineStats } = await discoverArticles({
        queries: searchQueries,
        engine: "auto",
        maxPerQuery: 10,
      });

      searchResultCount = results.length;
      searchEngineStats = {
        enginesUsed: engineStats.enginesUsed,
        engineResults: engineStats.engineResults,
        totalQueries: engineStats.totalQueries,
        productiveQueries: engineStats.productiveQueries,
      };

      console.log(`[Crawl] 搜索引擎: ${searchResultCount} 篇发现 (引擎: ${engineStats.enginesUsed.join(", ") || "无"})`);

      // Convert SearchResult to crawl article format
      for (const r of results) {
        allArticles.push({
          title: r.title,
          url: r.url,
          publish_date: r.publish_date,
          source: r.source,
          description: r.snippet,
          keyword_combo: `${r.keyword} (${r.tier})`,
        });
      }
    } catch (err) {
      console.log(`[Crawl] 搜索引擎发现失败: ${err instanceof Error ? err.message : err}`);
    }

    // Per-source counts
    const rssCount = allArticles.filter((a) => rssArticles.some((r) => r.url === a.url)).length;
    const newsapiCount = allArticles.filter((a) => newsApiArticles.some((n) => n.url === a.url)).length;
    const gdeltCount = allArticles.length - rssCount - newsapiCount - searchResultCount;
    const sourceStats = { rss: rssCount, newsapi: newsapiCount, gdelt: gdeltCount, search: searchResultCount };

    console.log(`[Crawl] 四源合计拉取 ${allArticles.length} 篇 (RSS:${sourceStats.rss} NewsAPI:${sourceStats.newsapi} GDELT:估算 search:${sourceStats.search})`);

    // ============================================================
    // Time filter + Dedup + Insert (batch guard with full stats)
    // ============================================================
    console.log(`[Crawl] 开始时间过滤、去重并写入数据库...`);
    const batchSize = 25;

    for (let i = 0; i < allArticles.length; i += batchSize) {
      const batch = allArticles.slice(i, i + batchSize).map((a) => ({
        title: a.title,
        publish_date: a.publish_date,
        url: a.url,
      }));

      const { passed, stats } = await batchGuardCheck(supabase, batch);

      // Merge stats
      totalGuardStats.total += stats.total;
      totalGuardStats.passed += stats.passed;
      for (const [reason, count] of Object.entries(stats.filtered)) {
        totalGuardStats.filtered[reason] = (totalGuardStats.filtered[reason] ?? 0) + count;
      }
      totalGuardStats.details.push(...stats.details);

      const toInsert = passed.filter((g) => g.guard.passed);

      const results = await Promise.allSettled(
        toInsert.map(({ article, guard }) => {
          const original = allArticles.find((a) => a.url === article.url);
          return createArticle(supabase, {
            title: article.title ?? original?.title ?? "Untitled",
            url: article.url,
            media: original?.source ?? "BBC",
            source: original?.source ?? "BBC",
            publish_date: article.publish_date ?? undefined,
            status: "已入库",
            abstract: original?.description ?? undefined,
            content: "",
            full_text_status: "missing",
            url_hash: guard.urlHash,
            keyword_combo: original?.keyword_combo ? [original.keyword_combo] : undefined,
          });
        }),
      );

      for (const r of results) {
        if (r.status === "fulfilled" && !r.value.error && r.value.data) {
          insertedCount++;
        }
      }

      console.log(`[Crawl] 批处理 ${Math.min(i + batchSize, allArticles.length)}/${allArticles.length}: 已写入 ${insertedCount}`);
    }

    // Summary log with all filter reasons
    const f = totalGuardStats.filtered;
    console.log(`[Crawl] ============ 过滤统计 ============`);
    console.log(`[Crawl] 总接收: ${totalGuardStats.total} 篇`);
    console.log(`[Crawl] 通过入库: ${insertedCount} 篇`);
    console.log(`[Crawl] 重复URL: ${f.duplicate_url ?? 0} 篇`);
    console.log(`[Crawl] 超范围(早): ${f.out_of_date_range_before ?? 0} 篇`);
    console.log(`[Crawl] 超范围(晚): ${f.out_of_date_range_after ?? 0} 篇`);
    console.log(`[Crawl] 日期缺失: ${f.missing_publish_date ?? 0} 篇`);
    console.log(`[Crawl] 日期无法解析: ${f.unparseable_date ?? 0} 篇`);
    console.log(`[Crawl] Hash错误: ${f.hash_error ?? 0} 篇`);
    console.log(`[Crawl] =======================================`);

    // Log first 10 filtered URLs with reasons
    if (totalGuardStats.details.length > 0) {
      console.log(`[Crawl] 过滤明细 (前10条):`);
      for (const d of totalGuardStats.details.slice(0, 10)) {
        console.log(`[Crawl]   [${d.reason}] ${d.url.slice(0, 80)} — ${d.detail}`);
      }
    }

    // Mark completed
    await updateCrawlJob(supabase, jobId, {
      status: "completed",
      progress: 100,
      total_fetched: allArticles.length,
      total_new: insertedCount,
      finished_at: new Date().toISOString(),
    });

    console.log(`[Crawl] ========================================`);
    console.log(`[Crawl] 任务完成: ${jobId}`);
    console.log(`[Crawl] 拉取 ${allArticles.length} 篇 (RSS/NewsAPI/GDELT/Search)`);
    console.log(`[Crawl] 新增入库 ${insertedCount} 篇`);
    console.log(`[Crawl] 过滤详情: 重复${f.duplicate_url ?? 0} | 日期早${f.out_of_date_range_before ?? 0} | 日期晚${f.out_of_date_range_after ?? 0} | 日期缺失${f.missing_publish_date ?? 0} | 无法解析${f.unparseable_date ?? 0} | 哈希错误${f.hash_error ?? 0}`);
    console.log(`[Crawl] ========================================`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.log(`[Crawl] 任务失败: ${errMsg}`);

    await updateCrawlJob(supabase, jobId, {
      status: "failed",
      error_message: errMsg,
      finished_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    success: true,
    stats: {
      totalFetched: allArticles.length,
      totalInserted: insertedCount,
      sourceBreakdown: {
        rss: sourceStats.rss,
        newsapi: sourceStats.newsapi,
        gdelt: allArticles.length - (sourceStats.rss + sourceStats.newsapi + sourceStats.search),
        search: sourceStats.search,
      },
      filterBreakdown: {
        duplicate_url: totalGuardStats.filtered.duplicate_url ?? 0,
        out_of_date_range_before: totalGuardStats.filtered.out_of_date_range_before ?? 0,
        out_of_date_range_after: totalGuardStats.filtered.out_of_date_range_after ?? 0,
        missing_publish_date: totalGuardStats.filtered.missing_publish_date ?? 0,
        unparseable_date: totalGuardStats.filtered.unparseable_date ?? 0,
        hash_error: totalGuardStats.filtered.hash_error ?? 0,
      },
    },
  });
}
