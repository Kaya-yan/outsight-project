import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createArticle } from "@/lib/data-access/articles";
import {
  createCollectionLog,
  updateCollectionLog,
} from "@/lib/data-access/collection-logs";
import { fetchRssArticles } from "@/lib/rss-parser";
import { fetchNewsApiArticles } from "@/lib/newsapi-client";
import { fetchGdeltArticles } from "@/lib/gdelt-client";
import { findExistingUrls, normalizeUrl } from "@/lib/dedup";
// Phase 2 (content extraction) temporarily disabled for stability testing
// import { extractWithConcurrency, summarizeExtraction } from "@/lib/extraction-pool";

interface SourceResult {
  name: string;
  fetched: number;
  inserted: number;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  // Parse period from request body
  let period: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    period = body.period;
  } catch {
    // No body — use default
  }

  const batchId = crypto.randomUUID();

  const { data: log } = await createCollectionLog(supabase, {
    batch_id: batchId,
    source: "rss+newsapi+gdelt",
    status: "running",
    triggered_by: user.id,
  });

  if (!log) {
    return NextResponse.json({ error: "无法创建同步日志" }, { status: 500 });
  }

  // ============================================================
  // Phase 1 — Metadata Discovery (ONLY)
  // Phase 2 (content extraction) is TEMPORARILY DISABLED
  // ============================================================

  let rssArticles: Awaited<ReturnType<typeof fetchRssArticles>> = [];
  let newsApiArticles: Awaited<ReturnType<typeof fetchNewsApiArticles>> = [];
  let gdeltResult: Awaited<ReturnType<typeof fetchGdeltArticles>> = {
    source: "gdelt",
    articles: [],
  };

  try {
    const [rss, news, gdelt] = await Promise.all([
      fetchRssArticles(),
      fetchNewsApiArticles(),
      fetchGdeltArticles(period),
    ]);
    rssArticles = rss;
    newsApiArticles = news;
    gdeltResult = gdelt;
  } catch (err) {
    await updateCollectionLog(supabase, log.id, {
      status: "failed",
      error_message: err instanceof Error ? err.message : "来源拉取失败",
    });
    return NextResponse.json({ error: "新闻来源拉取失败" }, { status: 500 });
  }

  const allArticles = [
    ...rssArticles,
    ...newsApiArticles,
    ...gdeltResult.articles,
  ];

  const totalFetched = allArticles.length;

  if (totalFetched === 0) {
    await updateCollectionLog(supabase, log.id, {
      articles_fetched: 0,
      articles_new: 0,
      status: "completed",
    });

    return NextResponse.json({
      success: true,
      period: period ?? null,
      fetched: 0,
      new: 0,
      duplicates: 0,
      sources: [
        { name: "RSS", fetched: rssArticles.length, inserted: 0 },
        { name: "NewsAPI", fetched: newsApiArticles.length, inserted: 0 },
        { name: "GDELT", fetched: gdeltResult.articles.length, inserted: 0 },
      ],
      gdeltDebug: (gdeltResult as { debug?: Record<string, number> }).debug,
      message: "未发现新语料",
    });
  }

  // Dedup by URL
  const allUrls = allArticles.map((a) => a.url);
  const existingUrls = await findExistingUrls(supabase, allUrls);

  const newArticles = allArticles.filter(
    (a) => !existingUrls.has(normalizeUrl(a.url)),
  );

  // Batch insert — metadata only, content field left empty
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
      content: "", // TEMP: content extraction disabled — save empty string
      keyword_combo: a.keyword_combo ? [a.keyword_combo] : undefined,
      created_by: user.id,
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

  const duplicates = totalFetched - newArticles.length;

  // ============================================================
  // Phase 2 — Content Extraction (TEMPORARILY DISABLED)
  // Was causing instability: combined fetch+extract overloaded APIs
  // and Vercel runtime. To re-enable, uncomment below and the import.
  // ============================================================

  // let extraction = { attempted: 0, succeeded: 0, failed: 0 };
  //
  // if (insertedIds.length > 0) {
  //   try {
  //     const urls = insertedIds.map((item) => item.url);
  //     extraction.attempted = urls.length;
  //     const results = await extractWithConcurrency(urls, 5);
  //     const summary = summarizeExtraction(results);
  //     extraction = summary;
  //     for (const item of insertedIds) {
  //       const result = results.get(item.url);
  //       if (!result || !result.fullText || result.fullText.length < 50) continue;
  //       try {
  //         await updateArticle(supabase, item.id, {
  //           content: result.content ?? result.fullText,
  //           full_text: result.fullText,
  //           author: result.author ?? undefined,
  //           word_count: result.wordCount ?? undefined,
  //           status: "已下载全文",
  //         } as Partial<import("@/types/database").Article>);
  //       } catch { /* individual update failure non-fatal */ }
  //     }
  //   } catch { /* Phase 2 failure does not invalidate Phase 1 results */ }
  // }

  // Finalize collection log
  await updateCollectionLog(supabase, log.id, {
    articles_fetched: totalFetched,
    articles_new: insertedCount,
    status: "completed",
  });

  // Per-source breakdown
  const sources: SourceResult[] = [
    {
      name: "RSS",
      fetched: rssArticles.length,
      inserted: newArticles.filter((a) => rssArticles.includes(a)).length,
    },
    {
      name: "NewsAPI",
      fetched: newsApiArticles.length,
      inserted: newArticles.filter((a) => newsApiArticles.includes(a)).length,
    },
    {
      name: "GDELT",
      fetched: gdeltResult.articles.length,
      inserted: newArticles.filter((a) => gdeltResult.articles.includes(a)).length,
    },
  ];

  return NextResponse.json({
    success: true,
    period: period ?? null,
    fetched: totalFetched,
    new: insertedCount,
    duplicates,
    sources,
    gdeltDebug: (gdeltResult as { debug?: Record<string, number> }).debug,
    message: `拉取 ${totalFetched} 篇，新增 ${insertedCount} 篇，重复 ${duplicates} 篇`,
  });
}
