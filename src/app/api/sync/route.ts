import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createArticle, updateArticle } from "@/lib/data-access/articles";
import {
  createCollectionLog,
  updateCollectionLog,
} from "@/lib/data-access/collection-logs";
import { fetchRssArticles } from "@/lib/rss-parser";
import { fetchNewsApiArticles } from "@/lib/newsapi-client";
import { fetchGdeltArticles } from "@/lib/gdelt-client";
import { findExistingUrls, normalizeUrl } from "@/lib/dedup";
import { extractWithConcurrency, summarizeExtraction } from "@/lib/extraction-pool";

interface SourceResult {
  name: string;
  fetched: number;
  inserted: number;
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

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
  // Phase 1 — Discovery
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
      fetchGdeltArticles(),
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
      fetched: 0,
      new: 0,
      duplicates: 0,
      sources: [
        { name: "RSS", fetched: rssArticles.length, inserted: 0 },
        { name: "NewsAPI", fetched: newsApiArticles.length, inserted: 0 },
        { name: "GDELT", fetched: gdeltResult.articles.length, inserted: 0 },
      ],
      gdeltDebug: (gdeltResult as { debug?: Record<string, number> }).debug,
      extraction: { attempted: 0, succeeded: 0, failed: 0 },
      message: "未发现新语料。提示：GDELT 免费 API 可能无法覆盖付费媒体全量历史数据，建议通过校园网数据库（ProQuest/EBSCO）检索后使用「批量上传」导入 CSV。",
    });
  }

  // Dedup by URL
  const allUrls = allArticles.map((a) => a.url);
  const existingUrls = await findExistingUrls(supabase, allUrls);

  const newArticles = allArticles.filter(
    (a) => !existingUrls.has(normalizeUrl(a.url)),
  );

  // Batch insert new articles into DB
  let insertedCount = 0;
  const insertedIds: { id: string; url: string }[] = [];
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
      keyword_combo: a.keyword_combo ? [a.keyword_combo] : undefined,
      created_by: user.id,
    }));

    const results = await Promise.allSettled(
      batch.map((input) => createArticle(supabase, input)),
    );

    for (const r of results) {
      if (r.status === "fulfilled" && !r.value.error && r.value.data) {
        insertedCount++;
        insertedIds.push({ id: r.value.data.id, url: r.value.data.url });
      }
    }
  }

  const duplicates = totalFetched - newArticles.length;

  // Update log after Phase 1
  await updateCollectionLog(supabase, log.id, {
    articles_fetched: totalFetched,
    articles_new: insertedCount,
    status: "running",
  });

  // ============================================================
  // Phase 2 — Content Extraction
  // ============================================================

  let extraction = { attempted: 0, succeeded: 0, failed: 0 };

  if (insertedIds.length > 0) {
    try {
      const urls = insertedIds.map((item) => item.url);
      extraction.attempted = urls.length;

      const results = await extractWithConcurrency(urls, 5);
      const summary = summarizeExtraction(results);
      extraction = summary;

      // Update each article with extracted content
      for (const item of insertedIds) {
        const result = results.get(item.url);
        if (!result || !result.fullText || result.fullText.length < 50) continue;

        try {
          await updateArticle(supabase, item.id, {
            content: result.content ?? result.fullText,
            full_text: result.fullText,
            author: result.author ?? undefined,
            word_count: result.wordCount ?? undefined,
            status: "已下载全文",
          } as Partial<import("@/types/database").Article>);
        } catch {
          // Individual article update failure is non-fatal
        }
      }
    } catch {
      // Phase 2 failure does not invalidate Phase 1 results
    }
  }

  // Finalize collection log
  const finalStatus = extraction.attempted > 0 && extraction.failed > 0
    ? "partial"
    : "completed";

  await updateCollectionLog(supabase, log.id, {
    status: finalStatus,
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

  const msgParts = [`拉取 ${totalFetched} 篇，新增 ${insertedCount} 篇，重复 ${duplicates} 篇`];
  if (extraction.succeeded > 0) {
    msgParts.push(`成功提取正文 ${extraction.succeeded} 篇`);
  }
  if (extraction.failed > 0) {
    msgParts.push(`${extraction.failed} 篇正文提取失败`);
  }

  return NextResponse.json({
    success: true,
    fetched: totalFetched,
    new: insertedCount,
    duplicates,
    sources,
    gdeltDebug: (gdeltResult as { debug?: Record<string, number> }).debug,
    extraction,
    message: msgParts.join("，"),
  });
}
