import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  listAnnotationsByArticle,
  listAnnotationsByCoder,
  createAnnotation,
} from "@/lib/data-access/annotations";
import { getArticleById, updateArticle } from "@/lib/data-access/articles";
import type { ArticleStatus } from "@/types/database";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("article_id");
  const coderId = searchParams.get("coder_id") ?? user.id;

  let data: unknown = null;
  let error: unknown = null;

  if (articleId) {
    const result = await listAnnotationsByArticle(supabase, articleId);
    data = result.data;
    error = result.error;
  } else {
    const result = await listAnnotationsByCoder(supabase, coderId);
    data = result.data;
    error = result.error;
  }

  if (error) return NextResponse.json({ error: "查询失败" }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json();
  if (!body.article_id || !body.node_id) {
    return NextResponse.json({ error: "语料ID和节点ID为必填项" }, { status: 400 });
  }

  const { data, error } = await createAnnotation(supabase, {
    article_id: body.article_id,
    node_id: body.node_id,
    coder_id: user.id,
    quote_text: body.quote_text,
    start_offset: body.start_offset,
    end_offset: body.end_offset,
    note: body.note,
    confidence: body.confidence ?? 3,
  });

  if (error) return NextResponse.json({ error: "标注创建失败" }, { status: 500 });

  // Auto-update article status: 待编码 → 编码完成
  const { data: article } = await getArticleById(supabase, body.article_id);
  if (article) {
    const status = article.status as ArticleStatus;
    if (status === "待编码" || status === "已预读") {
      await updateArticle(supabase, body.article_id, { status: "编码完成" });
    }
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
