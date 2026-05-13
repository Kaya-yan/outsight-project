import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createArticle } from "@/lib/data-access/articles";
import { getCrawlJob, updateCrawlJob, advanceBatch, addFetchedCount, addInsertedCount } from "@/lib/data-access/crawl-jobs";
import { fetchRssArticles } from "@/lib/rss-parser";
import { fetchNewsApiArticles } from "@/lib/newsapi-client";
import { batchGuardCheck } from "@/lib/insert-guard";
import { discoverArticles } from "@/lib/search-engine-client";
import { expandSearchQueries, type KeywordTier } from "@/lib/keyword-expander";
import { autoPeriod } from "@/lib/time-filter";
import { generateBatchPlan, type Batch, type GDELTBatchParams, type SearchBatchParams } from "@/lib/batch-planner";
import { TIER_1_COMBOS } from "@/lib/gdelt-keywords";

// ============================================================
// Shared scope (mirrors batch-planner)
// ============================================================
const ALL_MEDIA = [
  { name: "NYT", domains: "nytimes.com" },
  { name: "WP", domains: "washingtonpost.com" },
  { name: "WSJ", domains: "wsj.com" },
  { name: "Guardian", domains: "theguardian.com" },
  { name: "Economist", domains: "economist.com" },
  { name: "BBC", domains: "bbc.com OR bbc.co.uk" },
];

const GDELT_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";

/** Query GDELT for one combo across all 6 outlets within a single timespan. */
async function queryGdeltAllOutlets(query: string, timespan: string) {
  const domainFilter = ALL_MEDIA.map((m) => m.domains).join(" OR ");
  const params = new URLSearchParams({
    query: `(${query}) domain:${domainFilter} sourcelang:eng`,
    mode: "artlist", format: "json", maxrecords: "250",
    timespan, sort: "datedesc",
  });
  try {
    const res = await fetch(`${GDELT_BASE}?${params}`, {
      headers: { "User-Agent": "OutSight/2.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    if (!text || text.length < 10) return [];
    const json = JSON.parse(text);
    if (!json.articles || !Array.isArray(json.articles)) return [];
    return json.articles
      .filter((a: Record<string, unknown>) =>
        a.title && typeof a.title === "string" && a.title.length > 5 &&
        a.url && typeof a.url === "string" && a.url.startsWith("http"))
      .map((a: Record<string, unknown>) => {
        const sd = String(a.seendate ?? "");
        const domain = String(a.domain ?? "").toLowerCase();
        const matched = ALL_MEDIA.find((m) =>
          m.domains.toLowerCase().includes(domain) || domain.includes(m.domains.toLowerCase().split(" OR ")[0]));
        return {
          title: String(a.title), url: String(a.url),
          publish_date: sd.length >= 8 ? `${sd.slice(0, 4)}-${sd.slice(4, 6)}-${sd.slice(6, 8)}` : null,
          source: matched?.name ?? "未知", description: null, keyword_combo: query,
        };
      });
  } catch { return []; }
}

/** Insert a batch of articles with guard checks. Returns number inserted. */
async function insertArticles(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  articles: Array<{ title: string; url: string; publish_date: string | null; source: string; description: string | null; keyword_combo?: string }>,
): Promise<number> {
  if (articles.length === 0) return 0;
  let count = 0;
  const batchSize = 25;
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize).map((a) => ({
      title: a.title, publish_date: a.publish_date, url: a.url,
    }));
    const { passed } = await batchGuardCheck(supabase, batch);
    const toInsert = passed.filter((g) => g.guard.passed);
    const results = await Promise.allSettled(
      toInsert.map(({ article, guard }) => {
        const original = articles.find((a) => a.url === article.url);
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
      if (r.status === "fulfilled" && !r.value.error && r.value.data) count++;
    }
  }
  return count;
}

// ============================================================
// POST /api/crawl/execute-batch
// ============================================================

export async function POST(request: Request) {
  const supabase = await createClient();

  let jobId: string;
  try {
    const body = await request.json();
    jobId = body.job_id;
    if (!jobId) throw new Error("missing");
  } catch {
    return NextResponse.json({ error: "缺少 job_id" }, { status: 400 });
  }

  // Load job
  const { data: job } = await getCrawlJob(supabase, jobId);
  if (!job) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

  // Load or generate batch plan
  let batches: Batch[] = (job.query_params as Record<string, unknown>)?.batches as Batch[] | undefined;
  if (!batches || !Array.isArray(batches)) {
    batches = generateBatchPlan();
    // Persist plan
    await updateCrawlJob(supabase, jobId, {
      query_params: { ...(job.query_params as Record<string, unknown>), batches } as Record<string, unknown>,
      batch_total: batches.length,
      status: "running",
    });
  }

  const batchTotal = batches.length;

  // Mark job as running if not already
  if (job.status === "pending") {
    await updateCrawlJob(supabase, jobId, { status: "running", progress: 0 });
  }

  // Find next pending batch
  const nextIdx = batches.findIndex((b) => b.status === "pending");
  if (nextIdx === -1) {
    // All batches done
    await updateCrawlJob(supabase, jobId, {
      status: "completed", progress: 100,
      finished_at: new Date().toISOString(),
    });
    return NextResponse.json({
      done: true,
      batch_index: batchTotal,
      batch_total: batchTotal,
      progress: 100,
      total_fetched: job.total_fetched,
      total_new: job.total_new,
    });
  }

  const batch = batches[nextIdx];
  batch.status = "running";
  batches[nextIdx] = batch;
  console.log(`[Batch] [${nextIdx + 1}/${batchTotal}] ${batch.type}: ${batch.label}`);

  let discovered = 0;
  let inserted = 0;

  try {
    // Execute the single batch
    if (batch.type === "rss_newsapi") {
      const allArts: Array<{ title: string; url: string; publish_date: string | null; source: string; description: string | null; keyword_combo?: string }> = [];
      try {
        const rssArts = await fetchRssArticles();
        allArts.push(...rssArts);
        console.log(`[Batch] RSS: ${rssArts.length} 篇`);
      } catch (e) { console.log(`[Batch] RSS 失败: ${e}`); }
      try {
        const newsArts = await fetchNewsApiArticles();
        allArts.push(...newsArts);
        console.log(`[Batch] NewsAPI: ${newsArts.length} 篇`);
      } catch (e) { console.log(`[Batch] NewsAPI 失败: ${e}`); }
      discovered = allArts.length;
      inserted = await insertArticles(supabase, allArts);
    } else if (batch.type === "gdelt") {
      const params = batch.params as GDELTBatchParams;
      const allArts: Array<{ title: string; url: string; publish_date: string | null; source: string; description: string | null; keyword_combo?: string }> = [];
      for (const idx of params.comboIndices) {
        const combo = TIER_1_COMBOS[idx];
        if (!combo) continue;
        try {
          const arts = await queryGdeltAllOutlets(combo.query, params.periodTimespan);
          console.log(`[Batch] GDELT [${combo.label}]: ${arts.length} 篇`);
          allArts.push(...arts);
        } catch (e) { console.log(`[Batch] GDELT [${combo.label}] 失败: ${e}`); }
        // Short delay between GDELT queries within the batch
        await new Promise((r) => setTimeout(r, 1000));
      }
      discovered = allArts.length;
      inserted = await insertArticles(supabase, allArts);
    } else if (batch.type === "search") {
      const params = batch.params as SearchBatchParams;
      const searchTiers: KeywordTier[] = ["tier1_core", "tier2_policy"];
      const allSearchQueries = expandSearchQueries(searchTiers, ALL_MEDIA.map((m) => m.name));
      const batchQueries = params.queryIndices.map((i) => allSearchQueries[i]).filter(Boolean);
      if (batchQueries.length > 0) {
        const { results } = await discoverArticles({ queries: batchQueries, engine: "auto", maxPerQuery: 8 });
        console.log(`[Batch] Search: ${results.length} 篇`);
        discovered = results.length;
        const arts = results.map((r) => ({
          title: r.title, url: r.url, publish_date: r.publish_date,
          source: r.source, description: r.snippet, keyword_combo: `${r.keyword} (${r.tier})`,
        }));
        inserted = await insertArticles(supabase, arts);
      }
    } else if (batch.type === "flush") {
      console.log(`[Batch] 最终入库完成`);
      // Flush is a no-op in this architecture — articles were already inserted inline
    }

    // Mark batch done
    batch.status = "done";
    batches[nextIdx] = batch;

    // Update job counters
    if (discovered > 0) await addFetchedCount(supabase, jobId, discovered);
    if (inserted > 0) await addInsertedCount(supabase, jobId, inserted);

    // Advance to next batch
    await advanceBatch(supabase, jobId, nextIdx, batchTotal);

    // Persist updated batch plan
    await updateCrawlJob(supabase, jobId, {
      query_params: { ...(job.query_params as Record<string, unknown>), batches } as Record<string, unknown>,
    });
  } catch (err) {
    // Batch failed — mark it but continue with remaining batches
    batch.status = "failed";
    batches[nextIdx] = batch;
    console.error(`[Batch] [${nextIdx + 1}/${batchTotal}] FAILED: ${err instanceof Error ? err.message : err}`);
    await updateCrawlJob(supabase, jobId, {
      query_params: { ...(job.query_params as Record<string, unknown>), batches } as Record<string, unknown>,
      status: "partial_complete",
    });
    await advanceBatch(supabase, jobId, nextIdx, batchTotal);
  }

  // Check if all batches done
  const allDone = batches.every((b) => b.status === "done" || b.status === "failed");
  if (allDone) {
    const someFailed = batches.some((b) => b.status === "failed");
    await updateCrawlJob(supabase, jobId, {
      status: someFailed ? "partial_complete" : "completed",
      progress: 100,
      finished_at: new Date().toISOString(),
    });
    return NextResponse.json({
      done: true,
      batch_index: batchTotal,
      batch_total: batchTotal,
      progress: 100,
      total_fetched: job.total_fetched,
      total_new: job.total_new,
    });
  }

  return NextResponse.json({
    done: false,
    batch_index: nextIdx + 1,
    batch_total: batchTotal,
    progress: batchTotal > 0 ? Math.round(((nextIdx + 1) / batchTotal) * 95) : 0,
    total_fetched: job.total_fetched,
    total_new: job.total_new,
  });
}
