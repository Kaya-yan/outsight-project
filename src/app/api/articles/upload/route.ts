import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createArticle, updateArticle } from "@/lib/data-access/articles";
import { isWithinResearchPeriod, autoPeriod } from "@/lib/time-filter";
import { normalizeUrl, hashUrl } from "@/lib/dedup";
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
import type { CreateArticleInput } from "@/lib/data-access/articles";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const media = formData.get("media") as string | null;
    const period = formData.get("period") as string | null;
    const publishDate = formData.get("publish_date") as string | null;
    const url = formData.get("url") as string | null;

    if (!file) {
      return NextResponse.json({ error: "请上传文件" }, { status: 400 });
    }

    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (!ext || !["txt", "html", "htm", "md"].includes(ext)) {
      return NextResponse.json({ error: "仅支持 .txt / .html / .md 格式" }, { status: 400 });
    }

    const rawText = await file.text();

    // Simple HTML tag stripping
    const content = ext === "html" || ext === "htm"
      ? rawText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
      : rawText.trim();

    if (!content) {
      return NextResponse.json({ error: "文件内容为空" }, { status: 400 });
    }

    // Guess word count (English)
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    // Time filter
    if (publishDate) {
      const periodCheck = isWithinResearchPeriod(publishDate);
      if (!periodCheck.valid) {
        return NextResponse.json(
          { error: `发布日期不在研究范围内 (2022-10-01 ~ 2024-12-31)` },
          { status: 400 },
        );
      }
    }

    // URL hash
    const normalized = normalizeUrl(url || `upload://${crypto.randomUUID()}`);
    const urlHash = hashUrl(normalized);

    const input: CreateArticleInput = {
      title: title ?? fileName.replace(/\.[^.]+$/, ""),
      url: url ?? "",
      media: media ?? undefined,
      period: period ?? autoPeriod(publishDate) ?? undefined,
      publish_date: publishDate ?? undefined,
      content,
      word_count: wordCount,
      status: "已入库",
      created_by: user.id,
      full_text_status: "manual_uploaded",
      url_hash: urlHash,
    };

    const { data: article, error } = await createArticle(supabase, input);

    if (error || !article) {
      return NextResponse.json({ error: "创建失败" }, { status: 500 });
    }

    // ── Auto-processing pipeline (fire in background) ──
    // Step 1: Mark as cleaned immediately
    await updateArticle(supabase, article.id, { status: "已清洗" });

    // Step 2: Trigger AI pre-read asynchronously (don't block response)
    runPreReadPipeline(supabase, article.id, content).catch(() => {
      // Pipeline failure is non-blocking; article remains at 已清洗
    });

    return NextResponse.json({
      success: true,
      data: article,
      message: `语料已入库，共 ${wordCount} 词。后台正在执行 AI 预读分析...`,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "文件解析失败" }, { status: 400 });
  }
}

/**
 * Background AI pre-read pipeline.
 * Runs all 9 DeepSeek analyses then advances article status to 待编码.
 */
async function runPreReadPipeline(
  supabase: Awaited<ReturnType<typeof createClient>>,
  articleId: string,
  content: string,
) {
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

  if (summary) updates.ai_summary = summary;
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
  if (framework) updates.ai_evidence_quotes = framework.evidence;

  // Advance status: 已清洗 → 已预读 → 待编码
  updates.status = "已预读";

  const meta = {} as Record<string, unknown>;
  if (terms) meta.ai_terms = terms;
  if (linguistic) meta.ai_linguistic = linguistic;
  if (summaryZhResult) meta.ai_summary_zh = summaryZhResult;
  if (narrative) meta.ai_narrative = narrative;
  if (sources) meta.ai_sources = sources;
  if (tone) meta.ai_tone = tone;
  if (Object.keys(meta).length > 0) updates.metadata = meta;

  await updateArticle(supabase, articleId, updates);

  // Final advance to 待编码
  await updateArticle(supabase, articleId, { status: "待编码" });
}
