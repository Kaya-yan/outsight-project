import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeText, tokenize, wordFrequency, collocations, kwic } from "@/lib/linguistics/english-analyzer";

/**
 * POST /api/linguistics/analyze
 * Body: { articleIds?: string[], text?: string, mode?: "full"|"collocation"|"kwic", nodeWord?: string, span?: number }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: {
    articleIds?: string[];
    text?: string;
    mode?: "full" | "collocation" | "kwic";
    nodeWord?: string;
    span?: number;
    contextSize?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }

  let text = body.text || "";

  // If article IDs provided, concatenate their full_text
  if (body.articleIds?.length) {
    const { data: articles, error } = await supabase
      .from("articles")
      .select("full_text, title")
      .in("id", body.articleIds)
      .neq("source", "domestic_media");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (articles?.length) {
      text = articles.map((a) => a.full_text || "").filter(Boolean).join("\n\n");
    }

    if (!text) {
      return NextResponse.json({ error: "所选文章无全文内容" }, { status: 400 });
    }
  }

  if (!text || text.length < 50) {
    return NextResponse.json({ error: "文本过短，至少需要 50 字符" }, { status: 400 });
  }

  const mode = body.mode || "full";

  if (mode === "collocation") {
    if (!body.nodeWord) {
      return NextResponse.json({ error: "搭配分析需要提供 nodeWord 参数" }, { status: 400 });
    }
    const tokens = tokenize(text);
    const results = collocations(tokens, body.nodeWord, body.span ?? 5, 2);
    return NextResponse.json({ collocations: results, nodeWord: body.nodeWord, totalTokens: tokens.length });
  }

  if (mode === "kwic") {
    if (!body.nodeWord) {
      return NextResponse.json({ error: "KWIC 索引需要提供 nodeWord 参数" }, { status: 400 });
    }
    const tokens = tokenize(text);
    const results = kwic(tokens, body.nodeWord, body.contextSize ?? 5);
    return NextResponse.json({ concordance: results, nodeWord: body.nodeWord, totalHits: results.length });
  }

  // Full analysis
  const result = analyzeText(text);
  return NextResponse.json(result);
}
