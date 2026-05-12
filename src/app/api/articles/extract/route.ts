import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getArticleById, updateArticle } from "@/lib/data-access/articles";
import { extractContent } from "@/lib/content-extractor";

/**
 * POST /api/articles/extract
 * Body: { articleId: string }
 *
 * Non-blocking full-text extraction for a single article.
 * Failure does NOT affect the article's stored status —
 * the article remains in the database regardless of extraction outcome.
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

  let newStatus: "partial" | "complete" = "partial";

  try {
    console.log(`[Extract] Fetching ${article.url}`);
    const result = await extractContent(article.url);

    if (result.fullText && result.fullText.length >= 50) {
      newStatus = "complete";
    }

    console.log(`[Extract] Article ${articleId}: status=${newStatus}, words=${result.wordCount}, error=${result.error ?? "none"}`);

    await updateArticle(supabase, articleId, {
      content: result.content ?? result.fullText ?? undefined,
      full_text: result.fullText ?? undefined,
      author: result.author ?? undefined,
      word_count: result.wordCount ?? undefined,
      full_text_status: newStatus,
      status: newStatus === "complete" ? "已下载全文" : undefined,
    } as Partial<import("@/types/database").Article>);

    console.log(`[Extract] Article ${articleId} updated: full_text_status=${newStatus}`);

    return NextResponse.json({
      success: true,
      status: newStatus,
      wordCount: result.wordCount,
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
