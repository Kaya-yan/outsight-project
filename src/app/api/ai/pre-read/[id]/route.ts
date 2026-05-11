import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getArticleById } from "@/lib/data-access/articles";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: article } = await getArticleById(supabase, params.id);
  if (!article) return NextResponse.json({ error: "未找到该语料" }, { status: 404 });

  const aiData = {
    summary: article.ai_summary,
    sentiment: article.ai_sentiment,
    confidence: article.ai_confidence,
    framework_hint: article.ai_framework_hint,
    evidence_quotes: article.ai_evidence_quotes,
    hasAiData: !!(article.ai_summary || article.ai_sentiment || article.ai_framework_hint),
  };

  return NextResponse.json({ data: aiData });
}
