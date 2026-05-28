import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getArticleById, updateArticle } from "@/lib/data-access/articles";
import { extractContent } from "@/lib/content-extractor";
import { detectPaywall } from "@/lib/paywall-detector";
import type { FullTextStatus } from "@/types/database";

/**
 * POST /api/articles/extract
 * Body: { articleId: string }
 *
 * Full-text extraction with paywall detection.
 * If paywall detected → full_text_status = "paywalled"
 * If short but no keywords → "partial"
 * If good → "complete"
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let articleId: string;
  try {
    const body = await request.json();
    articleId = body.articleId;
    if (!articleId) throw new Error("missing");
  } catch {
    return NextResponse.json({ error: "缺少 articleId" }, { status: 400 });
  }

  console.log(`[Extract] Starting extraction for article ${articleId}`);

  const { data: article } = await getArticleById(supabase, articleId);
  if (!article) {
    return NextResponse.json({ error: "未找到该语料" }, { status: 404 });
  }

  if (!article.url) {
    return NextResponse.json({ error: "该语料无URL，无法提取正文" }, { status: 400 });
  }

  try {
    console.log(`[Extract] Fetching ${article.url}`);
    const result = await extractContent(article.url);

    // Paywall detection
    const paywall = detectPaywall(result.fullText, result.wordCount);

    let newStatus: FullTextStatus = "partial";
    if (paywall.isPaywalled) {
      newStatus = "paywalled";
    } else if (result.fullText && result.fullText.length >= 50 && !paywall.isShort) {
      newStatus = "complete";
    } else if (result.fullText && result.fullText.length >= 50) {
      newStatus = "partial";
    }

    console.log(`[Extract] Article ${articleId}: status=${newStatus}, words=${result.wordCount}, paywall=${paywall.isPaywalled}, error=${result.error ?? "none"}`);

    const updateData: Record<string, unknown> = {
      content: result.content ?? result.fullText ?? undefined,
      full_text: result.fullText ?? undefined,
      author: result.author ?? undefined,
      word_count: result.wordCount ?? undefined,
      full_text_status: newStatus,
      content_fetched_at: new Date().toISOString(),
    };

    // Update article status based on extraction result
    if (newStatus === "complete") {
      updateData.status = "已下载全文";
    }

    await updateArticle(supabase, articleId, updateData as Partial<import("@/types/database").Article>);

    console.log(`[Extract] Article ${articleId} updated: full_text_status=${newStatus}`);

    return NextResponse.json({
      success: true,
      status: newStatus,
      wordCount: result.wordCount,
      paywall: paywall.isPaywalled,
      matchedKeywords: paywall.matchedKeywords,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Extract] Failed for article ${articleId}:`, msg);

    return NextResponse.json({
      success: false,
      error: msg,
    }, { status: 500 });
  }
}
