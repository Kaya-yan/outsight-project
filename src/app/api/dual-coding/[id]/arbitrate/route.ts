import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRoundById, updateRound } from "@/lib/data-access/dual-coding-rounds";
import { updateAnnotation } from "@/lib/data-access/annotations";
import { getProfileById } from "@/lib/data-access/profiles";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: profile } = await getProfileById(supabase, user.id);
  if (!profile || (profile.role !== "admin" && profile.role !== "lead_researcher")) {
    return NextResponse.json({ error: "仅管理员和组长可执行仲裁" }, { status: 403 });
  }

  const { data: round } = await getRoundById(supabase, params.id);
  if (!round) return NextResponse.json({ error: "未找到该轮次" }, { status: 404 });
  if (round.status !== "disputed") {
    return NextResponse.json({ error: "该轮次不在争议状态" }, { status: 400 });
  }

  const { note, resolvedAnnotationIds } = await request.json();

  // Mark specified annotations as resolved
  if (Array.isArray(resolvedAnnotationIds)) {
    for (const annotId of resolvedAnnotationIds) {
      await updateAnnotation(supabase, annotId, {
        is_resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      });
    }
  }

  // Finalize the round
  await updateRound(supabase, params.id, {
    status: "arbitrated",
    arbiter_id: user.id,
    arbiter_note: note ?? undefined,
  });

  return NextResponse.json({
    success: true,
    message: "仲裁完成，标注结果已锁定",
  });
}
