import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reviewTask } from "@/lib/data-access/coding-tasks";
import { getProfileById } from "@/lib/data-access/profiles";
import { canReview } from "@/lib/auth/research-role";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: profile } = await getProfileById(supabase, user.id);
  if (!profile || !canReview(profile)) {
    return NextResponse.json({ error: "需要 reviewer 或 team_lead 研究角色才能执行终审" }, { status: 403 });
  }

  const body = await request.json();
  const { note } = body;

  const { data, error } = await reviewTask(supabase, params.id, user.id, note ?? "");

  if (error) {
    const msg = typeof error === "string" ? error : "终审失败";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
