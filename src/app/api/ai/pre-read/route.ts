import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getArticleById, updateArticle } from "@/lib/data-access/articles";
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
} from "@/lib/ai/deepseek-client";
import type { ArticleStatus } from "@/types/database";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { articleId } = await request.json();
  if (!articleId) {
    return NextResponse.json({ error: "请提供语料ID" }, { status: 400 });
  }

  const { data: article } = await getArticleById(supabase, articleId);
  if (!article) {
    return NextResponse.json({ error: "未找到该语料" }, { status: 404 });
  }

  const content = article.content ?? article.full_text;
  if (!content) {
    return NextResponse.json({ error: "语料无正文内容" }, { status: 400 });
  }

  // Run all 8 analyses in parallel
  const [
    summary,
    summaryZhResult,
    sentiment,
    framework,
    terms,
    linguistic,
    narrative,
    sources,
    tone,
  ] = await Promise.all([
    summarize(content),
    summarizeZh(content),
    analyzeSentiment(content),
    suggestFramework(content),
    extractTerms(content),
    linguisticCheck(content),
    analyzeNarrative(content),
    analyzeSources(content),
    analyzeTone(content),
  ]);

  const updates: Record<string, unknown> = {};

  if (summary) {
    updates.ai_summary = summary;
  }
  if (sentiment) {
    updates.ai_sentiment = sentiment.sentiment;
    updates.ai_confidence = sentiment.confidence;
  }
  let frameworkHint = "";
  if (framework) {
    frameworkHint = `${framework.framework} (${Math.round(framework.confidence * 100)}%)`;
  }
  if (sentiment) {
    frameworkHint = frameworkHint
      ? `${frameworkHint} | ${sentiment.sentiment} (${Math.round(sentiment.confidence * 100)}%)`
      : `${sentiment.sentiment} (${Math.round(sentiment.confidence * 100)}%)`;
  }
  updates.ai_framework_hint = frameworkHint || undefined;

  if (framework) {
    updates.ai_evidence_quotes = framework.evidence;
  }

  // Update status
  const currentStatus = article.status as ArticleStatus;
  if (["已清洗", "已入库", "已下载全文"].includes(currentStatus)) {
    updates.status = "已预读";
  }

  // Store additional results in metadata
  const meta = (article.metadata ?? {}) as Record<string, unknown>;
  if (terms) meta.ai_terms = terms;
  if (linguistic) meta.ai_linguistic = linguistic;
  if (summaryZhResult) meta.ai_summary_zh = summaryZhResult;
  if (narrative) meta.ai_narrative = narrative;
  if (sources) meta.ai_sources = sources;
  if (tone) meta.ai_tone = tone;
  updates.metadata = meta;

  const { data: updated, error } = await updateArticle(supabase, articleId, updates);
  if (error) {
    return NextResponse.json({ error: "AI 预读结果保存失败" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: updated,
    results: {
      summary,
      summaryZh: summaryZhResult,
      sentiment,
      framework,
      terms,
      linguistic,
      narrative,
      sources,
      tone,
    },
    message: "AI 预读完成",
  });
}
