import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listArticles, createArticle } from "@/lib/data-access/articles";
import type { CreateArticleInput } from "@/lib/data-access/articles";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
  const media = searchParams.get("media") ?? undefined;
  const period = searchParams.get("period") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const { data, error, count } = await listArticles(supabase, {
    page,
    pageSize,
    media,
    period,
    status,
    search,
    isArchived: false,
  });

  if (error) return NextResponse.json({ error: "查询失败" }, { status: 500 });

  return NextResponse.json({ data, total: count ?? 0, page, pageSize });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body: CreateArticleInput = await request.json();

  if (!body.title || !body.url) {
    return NextResponse.json({ error: "标题和URL为必填项" }, { status: 400 });
  }

  // Set defaults
  body.status = body.status ?? "已入库";
  body.created_by = user.id;
  body.media = body.media ?? body.source;
  body.source = body.source ?? body.media;

  const { data, error } = await createArticle(supabase, body);

  if (error) {
    const msg = typeof error === "object" && error !== null
      ? ((error as Record<string, unknown>).message || (error as Record<string, unknown>).details || JSON.stringify(error))
      : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
