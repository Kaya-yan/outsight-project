import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createArticle } from "@/lib/data-access/articles";
import { updateCrawlJob } from "@/lib/data-access/crawl-jobs";
import { fetchRssArticles, getFeedHealth } from "@/lib/rss-parser";
import { fetchNewsApiArticles } from "@/lib/newsapi-client";
import { batchGuardCheck } from "@/lib/insert-guard";
import { discoverArticles } from "@/lib/search-engine-client";
import { expandSearchQueries, type KeywordTier, MEDIA_SEARCH_DOMAINS } from "@/lib/keyword-expander";
import { TIER_1_COMBOS, TIER_2_COMBOS } from "@/lib/gdelt-keywords";
import { autoPeriod } from "@/lib/time-filter";
import { isFirecrawlAvailable, discoverLinks } from "@/lib/firecrawl-client";

// ============================================================
// All 6 media outlets × 5 research periods
// ============================================================
const ALL_MEDIA = [
  { name: "NYT", domains: "nytimes.com" },
  { name: "WP", domains: "washingtonpost.com" },
  { name: "WSJ", domains: "wsj.com" },
  { name: "Guardian", domains: "theguardian.com" },
  { name: "Economist", domains: "economist.com" },
  { name: "BBC", domains: "bbc.com OR bbc.co.uk" },
];

const ALL_PERIODS = [
  { value: "2022.10-2023.03", timespan: "20221001000000-20230331235959" },
  { value: "2023.04-2023.09", timespan: "20230401000000-20230930235959" },
  { value: "2023.10-2024.03", timespan: "20231001000000-20240331235959" },
  { value: "2024.04-2024.09", timespan: "20240401000000-20240930235959" },
  { value: "2024.10-2024.12", timespan: "20241001000000-20241231235959" },
  { value: "2025.01-2025.06", timespan: "20250101000000-20250630235959" },
  { value: "2025.07-2025.12", timespan: "20250701000000-20251231235959" },
];

const GDELT_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

/** Query GDELT with retry (data-pipeline pattern: exponential backoff). */
async function queryGdeltAllOutlets(query: string, timespan: string, sourceLabel: string) {
  const domainFilter = ALL_MEDIA.map((m) => m.domains).join(" OR ");
  const params = new URLSearchParams({
    query: `(${query}) domain:${domainFilter} sourcelang:eng`,
    mode: "artlist",
    format: "json",
    maxrecords: "250",
    timespan,
    sort: "datedesc",
  });

  const url = `${GDELT_BASE}?${params}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "OutSight/2.0 (Academic Research Tool)" },
        signal: AbortSignal.timeout(25000),
      });

      if (!res.ok) {
        console.log(`[Crawl] GDELT HTTP ${res.status} for: ${sourceLabel} (attempt ${attempt + 1})`);
        if (attempt === 0) { await new Promise((r) => setTimeout(r, 2000)); continue; }
        return [];
      }

      const text = await res.text();
      if (!text || text.length < 10) return [];

      const json = JSON.parse(text);
      if (!json.articles || !Array.isArray(json.articles)) return [];

      console.log(`[Crawl] GDELT ${json.articles.length} 条: ${sourceLabel}`);
      return json.articles
        .filter(
          (a: Record<string, unknown>) =>
            a.title && typeof a.title === "string" && a.title.length > 5 &&
            a.url && typeof a.url === "string" && a.url.startsWith("http"),
        )
        .map((a: Record<string, unknown>) => {
          const seendate = String(a.seendate ?? "");
          const domain = String(a.domain ?? "").toLowerCase();
          const matchedMedia = ALL_MEDIA.find((m) =>
            m.domains.toLowerCase().includes(domain) || domain.includes(m.domains.toLowerCase().split(" OR ")[0]),
          );
          return {
            title: String(a.title),
            url: String(a.url),
            publish_date: seendate.length >= 8
              ? `${seendate.slice(0, 4)}-${seendate.slice(4, 6)}-${seendate.slice(6, 8)}`
              : null,
            source: matchedMedia?.name ?? "未知",
            description: null,
            keyword_combo: query,
          };
        });
    } catch (err) {
      console.log(`[Crawl] GDELT 查询失败 (attempt ${attempt + 1}): ${err instanceof Error ? err.message : err}`);
      if (attempt === 0) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return [];
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
  console.log(`[Crawl] 范围: 全部6媒体 / 7时段(2022-2025) / 仅元数据`);
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
    // Source 1: RSS (all feeds)
    // ============================================================
    console.log(`[Crawl] 开始请求 RSS...`);
    let rssArticles: Awaited<ReturnType<typeof fetchRssArticles>> = [];
    try {
      rssArticles = await fetchRssArticles();
      console.log(`[Crawl] RSS: ${rssArticles.length} 篇 (BBC/Guardian)`);
      allArticles.push(...rssArticles);
    } catch (err) {
      console.log(`[Crawl] RSS 请求失败: ${err instanceof Error ? err.message : err}`);
    }

    // ============================================================
    // Source 2: NewsAPI (all 6 media)
    // ============================================================
    console.log(`[Crawl] 开始请求 NewsAPI...`);
    let newsApiArticles: Awaited<ReturnType<typeof fetchNewsApiArticles>> = [];
    try {
      newsApiArticles = await fetchNewsApiArticles();
      console.log(`[Crawl] NewsAPI: ${newsApiArticles.length} 篇 (全部媒体)`);
      allArticles.push(...newsApiArticles);
    } catch (err) {
      console.log(`[Crawl] NewsAPI 请求失败: ${err instanceof Error ? err.message : err}`);
    }

    // ============================================================
    // Source 3: GDELT (all 6 outlets × 5 periods × Tier 1 + Tier 2 combos)
    // ============================================================
    const GDELT_COMBOS = [...TIER_1_COMBOS, ...TIER_2_COMBOS];
    const gdeltTotalQueries = ALL_PERIODS.length * GDELT_COMBOS.length;
    console.log(`[Crawl] 开始请求 GDELT (${ALL_PERIODS.length} 时段 × 全部6媒体 × ${GDELT_COMBOS.length} 关键词 = ${gdeltTotalQueries} 次查询)`);

    let gdeltQueryCount = 0;
    for (const period of ALL_PERIODS) {
      for (let ci = 0; ci < GDELT_COMBOS.length; ci++) {
        const combo = GDELT_COMBOS[ci];
        gdeltQueryCount++;
        const label = `[${period.value}] ${combo.label}`;
        console.log(`[Crawl] GDELT [${gdeltQueryCount}/${gdeltTotalQueries}] ${label}`);

        try {
          const gdeltArticles = await queryGdeltAllOutlets(combo.query, period.timespan, label);
          allArticles.push(...gdeltArticles);
        } catch (err) {
          console.log(`[Crawl] GDELT 查询失败: ${err instanceof Error ? err.message : err}`);
        }

        // Update progress: 0-5% RSS+NewsAPI, 5-95% GDELT
        const progress = 5 + Math.round((gdeltQueryCount / gdeltTotalQueries) * 90);
        await updateCrawlJob(supabase, jobId, {
          progress,
          total_fetched: allArticles.length,
        });
        console.log(`[Crawl] 当前累计 ${allArticles.length} 篇 (进度 ${progress}%)`);

        // Rate limit: 1500ms between queries
        const isLast = period === ALL_PERIODS[ALL_PERIODS.length - 1] && ci === GDELT_COMBOS.length - 1;
        if (!isLast) {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    }

    // ============================================================
    // Source 4: Search Engine Discovery (all 6 media, all 3 tiers)
    // ============================================================
    console.log(`[Crawl] 开始搜索引擎发现...`);
    const searchTiers: KeywordTier[] = ["tier1_core", "tier2_policy", "tier3_issues"];
    const searchMedia = ALL_MEDIA.map((m) => m.name);
    const searchQueries = expandSearchQueries(searchTiers, searchMedia);
    console.log(`[Crawl] 搜索层: ${searchQueries.length} 个查询 (${searchTiers.join(", ")} × ${searchMedia.length} 媒体)`);

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
            media: original?.source ?? "未知",
            source: original?.source ?? "未知",
            publish_date: article.publish_date ?? undefined,
            period: autoPeriod(article.publish_date) ?? undefined,
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

    // Data quality summary (data-pipeline pattern)
    const conversionRate = allArticles.length > 0
      ? Math.round((insertedCount / allArticles.length) * 100)
      : 0;

    console.log(`[Crawl] ========================================`);
    console.log(`[Crawl] 任务完成: ${jobId}`);
    console.log(`[Crawl] 拉取 ${allArticles.length} 篇 (RSS/NewsAPI/GDELT/Search)`);
    console.log(`[Crawl] 新增入库 ${insertedCount} 篇 (转化率 ${conversionRate}%)`);
    console.log(`[Crawl] 过滤详情: 重复${f.duplicate_url ?? 0} | 过旧${f.date_too_old ?? 0} | 过新${f.date_too_new ?? 0} | 未来日期${f.date_in_future ?? 0} | 日期缺失${f.missing_publish_date ?? 0} | 无法解析${f.unparseable_date ?? 0} | 哈希错误${f.hash_error ?? 0}`);

    // RSS feed health report (rss-aggregator pattern)
    const feedHealth = getFeedHealth();
    const unhealthyFeeds = feedHealth.filter((h) => h.consecutiveFailures >= 3);
    if (unhealthyFeeds.length > 0) {
      console.log(`[Crawl] ⚠ RSS 失效源 (${unhealthyFeeds.length}):`);
      for (const h of unhealthyFeeds) {
        console.log(`  - ${h.name} (${h.url}): 连续失败 ${h.consecutiveFailures} 次`);
      }
    }

    // Firecrawl availability notice
    if (!isFirecrawlAvailable()) {
      console.log(`[Crawl] 💡 提示: 设置 FIRECRAWL_API_KEY 环境变量可启用 Firecrawl 链接发现和正文提取`);
    }

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

  const conversionRate = allArticles.length > 0
    ? Math.round((insertedCount / allArticles.length) * 100)
    : 0;

  const feedHealth = getFeedHealth();
  const unhealthyFeeds = feedHealth.filter((h) => h.consecutiveFailures >= 3);

  return NextResponse.json({
    success: true,
    stats: {
      totalFetched: allArticles.length,
      totalInserted: insertedCount,
      conversionRate,
      sourceBreakdown: {
        rss: sourceStats.rss,
        newsapi: sourceStats.newsapi,
        gdelt: allArticles.length - (sourceStats.rss + sourceStats.newsapi + sourceStats.search),
        search: sourceStats.search,
      },
      filterBreakdown: {
        duplicate_url: totalGuardStats.filtered.duplicate_url ?? 0,
        date_too_old: totalGuardStats.filtered.date_too_old ?? 0,
        date_too_new: totalGuardStats.filtered.date_too_new ?? 0,
        date_in_future: totalGuardStats.filtered.date_in_future ?? 0,
        missing_publish_date: totalGuardStats.filtered.missing_publish_date ?? 0,
        unparseable_date: totalGuardStats.filtered.unparseable_date ?? 0,
        hash_error: totalGuardStats.filtered.hash_error ?? 0,
      },
      feedHealth: {
        total: feedHealth.length,
        unhealthy: unhealthyFeeds.length,
        details: unhealthyFeeds.map((h) => ({
          name: h.name,
          url: h.url,
          consecutiveFailures: h.consecutiveFailures,
          lastSuccess: h.lastSuccess,
        })),
      },
      firecrawlEnabled: isFirecrawlAvailable(),
    },
  });
}
