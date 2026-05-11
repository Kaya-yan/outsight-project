import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createArticle } from "@/lib/data-access/articles";
import { updateCrawlJob } from "@/lib/data-access/crawl-jobs";
import { fetchRssArticles } from "@/lib/rss-parser";
import { fetchNewsApiArticles } from "@/lib/newsapi-client";
import { findExistingUrls, normalizeUrl } from "@/lib/dedup";
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

    console.log(`[Crawl] 三源合计拉取 ${allArticles.length} 篇`);

    // ============================================================
    // Dedup + Insert
    // ============================================================
    console.log(`[Crawl] 开始去重并写入数据库...`);
    const allUrls = allArticles.map((a) => a.url);
    const existingUrls = await findExistingUrls(supabase, allUrls);

    const newArticles = allArticles.filter(
      (a) => !existingUrls.has(normalizeUrl(a.url)),
    );

    console.log(`[Crawl] 新增 ${newArticles.length} 篇，重复 ${allArticles.length - newArticles.length} 篇`);

    let insertedCount = 0;
    const batchSize = 25;
    for (let i = 0; i < newArticles.length; i += batchSize) {
      const batch = newArticles.slice(i, i + batchSize).map((a) => ({
        title: a.title,
        url: a.url,
        media: a.source,
        source: a.source,
        publish_date: a.publish_date ?? undefined,
        status: "待发现" as const,
        abstract: a.description ?? undefined,
        content: "",
        keyword_combo: a.keyword_combo ? [a.keyword_combo] : undefined,
      }));

      const results = await Promise.allSettled(
        batch.map((input) => createArticle(supabase, input)),
      );

      for (const r of results) {
        if (r.status === "fulfilled" && !r.value.error && r.value.data) {
          insertedCount++;
        }
      }
    }

    console.log(`[Crawl] 数据库写入成功: ${insertedCount} 篇`);

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
    console.log(`[Crawl] 拉取 ${allArticles.length} 篇，新增 ${insertedCount} 篇`);
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

  return NextResponse.json({ success: true });
}
