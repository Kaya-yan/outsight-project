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

  try {
    // Run all 3 sources in parallel
    const [rssArticles, newsApiArticles, gdeltResult] = await Promise.all([
      fetchRssArticles(),
      fetchNewsApiArticles(),
      fetchGdeltArticles(),
    ]);

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
        message: "未发现新语料。提示：GDELT 免费 API 可能无法覆盖付费媒体全量历史数据，建议通过校园网数据库（ProQuest/EBSCO）检索后使用「批量上传」导入 CSV。",
      });
    }

    // Dedup by URL
    const allUrls = allArticles.map((a) => a.url);
    const existingUrls = await findExistingUrls(supabase, allUrls);

    const newArticles = allArticles.filter(
      (a) => !existingUrls.has(normalizeUrl(a.url)),
    );

    // Batch insert new articles
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
        created_by: user.id,
      }));

      const results = await Promise.allSettled(
        batch.map((input) => createArticle(supabase, input)),
      );
      insertedCount += results.filter((r) => r.status === "fulfilled" && !r.value.error).length;
    }

    const duplicates = totalFetched - newArticles.length;

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

    await updateCollectionLog(supabase, log.id, {
      articles_fetched: totalFetched,
      articles_new: insertedCount,
      status: "completed",
    });

    return NextResponse.json({
      success: true,
      fetched: totalFetched,
      new: insertedCount,
      duplicates,
      sources,
      message: `拉取 ${totalFetched} 篇，新增 ${insertedCount} 篇，重复 ${duplicates} 篇`,
    });
  } catch (err) {
    await updateCollectionLog(supabase, log.id, {
      status: "failed",
      error_message: err instanceof Error ? err.message : "同步失败",
    });

    return NextResponse.json({ error: "同步失败" }, { status: 500 });
  }
}
