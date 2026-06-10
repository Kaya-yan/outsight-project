import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  analyzeFrame, analyzeDiscourseActors, analyzePolicyTools,
  analyzeSentimentZh, analyzeIntertextuality, analyzeSyntaxFormality,
  analyzeNarrativePerspective, analyzeSpatialReference,
  type DomesticAiAnalysis,
} from "@/lib/domestic/ai-dimensions";

/**
 * POST /api/domestic/analyze
 * Body: { articleId: string }
 * Returns SSE stream with per-dimension progress events.
 */

interface DimDef {
  key: keyof Omit<DomesticAiAnalysis, "analyzed_at" | "errors">;
  fn: (text: string) => Promise<{ data: unknown; error: string | null; truncated?: boolean }>;
}

const DIMENSIONS: DimDef[] = [
  { key: "frame", fn: analyzeFrame },
  { key: "discourse_actors", fn: analyzeDiscourseActors },
  { key: "policy_tools", fn: analyzePolicyTools },
  { key: "sentiment", fn: analyzeSentimentZh },
  { key: "intertextuality", fn: analyzeIntertextuality },
  { key: "syntax_formality", fn: analyzeSyntaxFormality },
  { key: "narrative", fn: analyzeNarrativePerspective },
  { key: "spatial", fn: analyzeSpatialReference },
];

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: { articleId: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }

  const { articleId } = body;
  if (!articleId) {
    return NextResponse.json({ error: "缺少 articleId" }, { status: 400 });
  }

  // Fetch article
  const { data: article, error: fetchErr } = await supabase
    .from("articles")
    .select("id, full_text, metadata")
    .eq("id", articleId)
    .eq("source", "domestic_media")
    .single();

  if (fetchErr || !article) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  if (!article.full_text || article.full_text.length < 50) {
    return NextResponse.json({ error: "文章正文过短，无法分析" }, { status: 400 });
  }

  console.log(`[Analyze] Start: articleId=${articleId}, textLen=${article.full_text.length}, title="${article.full_text.slice(0, 30)}..."`);

  const encoder = new TextEncoder();
  let clientDisconnected = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        if (clientDisconnected) return;
        try { controller.enqueue(encoder.encode(sseEvent(data))); } catch { /* stream closed */ }
      };

      // Detect client disconnect
      request.signal.addEventListener("abort", () => { clientDisconnected = true; });

      send({ phase: "start", total: DIMENSIONS.length });

      const results: Record<string, unknown> = {};
      const errors: Record<string, string | null> = {};

      // Parallel execution with concurrency limit of 4 (avoid API rate limiting)
      const CONCURRENCY = 4;
      let completed = 0;

      async function runDim(dim: DimDef) {
        if (clientDisconnected) return;

        send({ phase: "analyzing", dimension: dim.key, current: completed + 1, total: DIMENSIONS.length });
        const dimStart = Date.now();

        try {
          const result = await dim.fn(article.full_text);
          const dimMs = Date.now() - dimStart;
          console.log(`[Analyze] ${dim.key}: status=${result.data ? "ok" : "failed"}, error=${result.error ?? "none"}, truncated=${result.truncated ?? false}, latency=${dimMs}ms`);

          results[dim.key] = result.data;
          errors[dim.key] = result.error;
          completed++;

          send({
            phase: "dimension_done",
            dimension: dim.key,
            status: result.data ? "ok" : "failed",
            error: result.error,
            truncated: result.truncated ?? false,
            current: completed,
            total: DIMENSIONS.length,
          });
        } catch (err) {
          errors[dim.key] = err instanceof Error ? err.message : "未知错误";
          completed++;

          send({
            phase: "dimension_done",
            dimension: dim.key,
            status: "failed",
            error: errors[dim.key],
            current: completed,
            total: DIMENSIONS.length,
          });
        }
      }

      // Process dimensions in batches of CONCURRENCY
      for (let i = 0; i < DIMENSIONS.length; i += CONCURRENCY) {
        if (clientDisconnected) break;
        const batch = DIMENSIONS.slice(i, i + CONCURRENCY);
        await Promise.allSettled(batch.map((dim) => runDim(dim)));
      }

      // If client disconnected, skip saving
      if (clientDisconnected) {
        controller.close();
        return;
      }

      // Build final analysis
      const analysis: DomesticAiAnalysis = {
        frame: results.frame as DomesticAiAnalysis["frame"] ?? null,
        discourse_actors: results.discourse_actors as DomesticAiAnalysis["discourse_actors"] ?? null,
        policy_tools: results.policy_tools as DomesticAiAnalysis["policy_tools"] ?? null,
        sentiment: results.sentiment as DomesticAiAnalysis["sentiment"] ?? null,
        intertextuality: results.intertextuality as DomesticAiAnalysis["intertextuality"] ?? null,
        syntax_formality: results.syntax_formality as DomesticAiAnalysis["syntax_formality"] ?? null,
        narrative: results.narrative as DomesticAiAnalysis["narrative"] ?? null,
        spatial: results.spatial as DomesticAiAnalysis["spatial"] ?? null,
        analyzed_at: new Date().toISOString(),
        errors: {
          frame: errors.frame ?? null,
          discourse_actors: errors.discourse_actors ?? null,
          policy_tools: errors.policy_tools ?? null,
          sentiment: errors.sentiment ?? null,
          intertextuality: errors.intertextuality ?? null,
          syntax_formality: errors.syntax_formality ?? null,
          narrative: errors.narrative ?? null,
          spatial: errors.spatial ?? null,
        },
      };

      // Save to database — re-fetch metadata to avoid race condition
      const { data: freshArticle } = await supabase
        .from("articles")
        .select("metadata")
        .eq("id", articleId)
        .single();
      const existingMeta = ((freshArticle?.metadata ?? article.metadata) as Record<string, unknown>) ?? {};
      const updatedMeta = { ...existingMeta, domestic_ai_analysis: analysis };

      const { error: updateErr } = await supabase
        .from("articles")
        .update({ metadata: updatedMeta })
        .eq("id", articleId);

      if (updateErr) {
        console.error(`[Analyze] Save failed: ${updateErr.message}`);
        send({ phase: "error", error: "保存分析结果失败" });
      } else {
        const successCount = Object.values(results).filter((v) => v !== null).length;
        console.log(`[Analyze] Done: success=${successCount}/${DIMENSIONS.length}, failed=${DIMENSIONS.length - successCount}`);
        send({
          phase: "done",
          analysis,
          summary: { success: successCount, failed: DIMENSIONS.length - successCount },
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
