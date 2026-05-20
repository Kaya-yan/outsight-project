import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listLiterature, createLit } from "@/lib/data-access/literature";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const forReview = searchParams.get("for_review");
  const sort = (searchParams.get("sort") ?? "created_at") as "rating" | "created_at" | "read_count";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

  const { data, error, count } = await listLiterature(supabase, {
    search, tag,
    forReview: forReview !== null ? forReview === "1" : undefined,
    sort, page, pageSize,
  });

  if (error) return NextResponse.json({ error: "查询失败" }, { status: 500 });
  return NextResponse.json({ data, total: count ?? 0 });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json();
  if (!body.title) return NextResponse.json({ error: "标题为必填项" }, { status: 400 });

  // Auto-fill reader_name from profile
  const { data: creatorProfile } = await supabase.from("profiles").select("display_name, username").eq("id", user.id).single();
  const readerName = creatorProfile?.display_name || creatorProfile?.username || "未知";

  const { data, error } = await createLit(supabase, {
    title: body.title,
    author: body.author || null,
    publish_date: body.publish_date || null,
    journal: body.journal || null,
    url: body.url || null,
    summary: body.summary || null,
    abstract: body.abstract || null,
    key_points: body.key_points || [],
    research_method: body.research_method || null,
    reader_name: readerName,
    inspiration: body.inspiration || null,
    notes: body.notes || null,
    for_review: body.for_review ?? false,
    rating: body.rating || null,
    tags: body.tags || [],
    attachment_path: body.attachment_path || null,
    attachment_name: body.attachment_name || null,
    created_by: user.id,
  });

  if (error) return NextResponse.json({ error: "创建失败" }, { status: 500 });
  return NextResponse.json({ success: true, data }, { status: 201 });
}
