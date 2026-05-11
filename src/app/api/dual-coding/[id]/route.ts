import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRoundById, updateRound } from "@/lib/data-access/dual-coding-rounds";
import { listAnnotationsByArticle } from "@/lib/data-access/annotations";
import { getProfileById } from "@/lib/data-access/profiles";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: round } = await getRoundById(supabase, params.id);
  if (!round) return NextResponse.json({ error: "未找到该轮次" }, { status: 404 });

  // Get both coders' annotations
  const [annotationsA, annotationsB] = await Promise.all([
    listAnnotationsByArticle(supabase, round.article_id),
    listAnnotationsByArticle(supabase, round.article_id),
  ]);

  // Filter by coder
  const coderAAnnotations = (annotationsA.data ?? []).filter(
    (a) => a.coder_id === round.coder_a_id,
  );
  const coderBAnnotations = (annotationsB.data ?? []).filter(
    (a) => a.coder_id === round.coder_b_id,
  );

  return NextResponse.json({
    data: {
      round,
      coderA: coderAAnnotations,
      coderB: coderBAnnotations,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: profile } = await getProfileById(supabase, user.id);
  if (!profile || (profile.role !== "admin" && profile.role !== "lead_researcher")) {
    return NextResponse.json({ error: "仅管理员和组长可操作" }, { status: 403 });
  }

  const body = await request.json();
  const { data, error } = await updateRound(supabase, params.id, body);
  if (error) return NextResponse.json({ error: "更新失败" }, { status: 500 });

  return NextResponse.json({ success: true, data });
}
