import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listRounds, createRound } from "@/lib/data-access/dual-coding-rounds";
import { getProfileById } from "@/lib/data-access/profiles";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const coderId = searchParams.get("coder_id") ?? undefined;

  const { data, error, count } = await listRounds(supabase, { status, coderId, pageSize: 50 });

  if (error) return NextResponse.json({ error: "查询失败" }, { status: 500 });
  return NextResponse.json({ data, total: count });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: profile } = await getProfileById(supabase, user.id);
  if (!profile || (profile.role !== "admin" && profile.role !== "lead_researcher")) {
    return NextResponse.json({ error: "仅管理员和组长可创建双编码任务" }, { status: 403 });
  }

  const { article_id, coder_a_id, coder_b_id } = await request.json();
  if (!article_id || !coder_a_id || !coder_b_id) {
    return NextResponse.json({ error: "请提供文章和两个编码员" }, { status: 400 });
  }

  if (coder_a_id === coder_b_id) {
    return NextResponse.json({ error: "两个编码员不能相同" }, { status: 400 });
  }

  const { data, error } = await createRound(supabase, {
    article_id,
    coder_a_id,
    coder_b_id,
  });

  if (error) {
    return NextResponse.json({ error: "创建失败，该文章可能已有双编码任务" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
