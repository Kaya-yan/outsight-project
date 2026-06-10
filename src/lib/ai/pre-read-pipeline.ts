import { updateArticle } from "@/lib/data-access/articles";
import type { createClient } from "@/lib/supabase/server";
import {
  summarize,
  summarizeZh,
  analyzeSentiment,
  suggestFramework,
  extractTerms,
  linguisticCheck,
  analyzeNarrative,
  analyzeSources,
  analyzeTone,
} from "./ai-client";

/**
 * Background AI pre-read pipeline.
 * Runs all 9 MiMo analyses then advances article status to 已预读 → 待编码.
 */
export async function runPreReadPipeline(
  supabase: Awaited<ReturnType<typeof createClient>>,
  articleId: string,
  content: string,
) {
  const [
    summary, summaryZhResult, sentiment, framework,
    terms, linguistic, narrative, sources, tone,
  ] = await Promise.all([
    summarize(content), summarizeZh(content), analyzeSentiment(content),
    suggestFramework(content), extractTerms(content), linguisticCheck(content),
    analyzeNarrative(content), analyzeSources(content), analyzeTone(content),
  ]);

  const updates: Record<string, unknown> = {};
  if (summary) updates.ai_summary = summary;
  if (sentiment) {
    updates.ai_sentiment = sentiment.sentiment;
    updates.ai_confidence = sentiment.confidence;
  }
  let hint = "";
  if (framework) hint = `${framework.framework} (${Math.round(framework.confidence * 100)}%)`;
  if (sentiment) hint = hint ? `${hint} | ${sentiment.sentiment}` : sentiment.sentiment;
  updates.ai_framework_hint = hint || undefined;
  if (framework) updates.ai_evidence_quotes = framework.evidence;
  // Single atomic update — skip intermediate "已预读" to avoid partial failure window
  updates.status = "待编码";

  const meta = {} as Record<string, unknown>;
  if (terms) meta.ai_terms = terms;
  if (linguistic) meta.ai_linguistic = linguistic;
  if (summaryZhResult) meta.ai_summary_zh = summaryZhResult;
  if (narrative) meta.ai_narrative = narrative;
  if (sources) meta.ai_sources = sources;
  if (tone) meta.ai_tone = tone;
  if (Object.keys(meta).length > 0) updates.metadata = meta;

  const { error } = await updateArticle(supabase, articleId, updates);
  if (error) {
    console.error(`[PreRead] 文章 ${articleId} 预读入库失败:`, error);
    throw new Error(`预读入库失败: ${error}`);
  }
}
