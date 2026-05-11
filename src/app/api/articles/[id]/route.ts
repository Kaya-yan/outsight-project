import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getArticleById, updateArticle, deleteArticle } from "@/lib/data-access/articles";
import { getProfileById } from "@/lib/data-access/profiles";
import { ARTICLE_STATUS_TRANSITIONS, type ArticleStatus } from "@/types/database";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data, error } = await getArticleById(supabase, params.id);
  if (error) return NextResponse.json({ error: "未找到该语料" }, { status: 404 });

  return NextResponse.json({ data });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { id } = params;
  const body = await request.json();

  // Validate status transition if status is being changed
  if (body.status) {
    const { data: current } = await getArticleById(supabase, id);
    if (!current) return NextResponse.json({ error: "未找到该语料" }, { status: 404 });

    const currentStatus = current.status as ArticleStatus;
    const newStatus = body.status as ArticleStatus;
    const allowed = ARTICLE_STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `不能从"${currentStatus}"转为"${newStatus}"` },
        { status: 400 },
      );
    }
  }

  const { data, error } = await updateArticle(supabase, id, body);
  if (error) return NextResponse.json({ error: "更新失败" }, { status: 500 });

  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  // Only admin and lead_researcher can delete
  const { data: profile } = await getProfileById(supabase, user.id);
  if (!profile || (profile.role !== "admin" && profile.role !== "lead_researcher")) {
    return NextResponse.json({ error: "无权限删除" }, { status: 403 });
  }

  const { error } = await deleteArticle(supabase, params.id);
  if (error) return NextResponse.json({ error: "删除失败" }, { status: 500 });

  return NextResponse.json({ success: true });
}
