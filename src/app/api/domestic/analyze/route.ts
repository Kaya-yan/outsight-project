import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runDomesticAiPipeline } from "@/lib/domestic/ai-dimensions";

/**
 * POST /api/domestic/analyze
 * Body: { articleId: string }
 * Triggers 8-dimension AI analysis on a single domestic article.
 */
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

  // Run 8-dimension analysis
  const analysis = await runDomesticAiPipeline(article.full_text);

  // Merge into metadata
  const existingMeta = (article.metadata as Record<string, unknown>) ?? {};
  const updatedMeta = {
    ...existingMeta,
    domestic_ai_analysis: analysis,
  };

  const { error: updateErr } = await supabase
    .from("articles")
    .update({ metadata: updatedMeta })
    .eq("id", articleId);

  if (updateErr) {
    return NextResponse.json({ error: "保存分析结果失败" }, { status: 500 });
  }

  return NextResponse.json({ data: analysis });
}
