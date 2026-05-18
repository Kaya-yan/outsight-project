import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTaskById, updateTask } from "@/lib/data-access/coding-tasks";
import { listAnnotationsByArticle } from "@/lib/data-access/annotations";
import { getProfileById } from "@/lib/data-access/profiles";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: task, error } = await getTaskById(supabase, params.id);
  if (error || !task) return NextResponse.json({ error: "未找到该任务" }, { status: 404 });

  // Get annotations for this task
  const { data: annotations } = await listAnnotationsByArticle(supabase, task.article_id);

  // Filter by task_id if set, otherwise fall back to coder_id match (backward compat)
  const taskAnnotations = (annotations ?? []).filter(
    (a) => a.task_id === task.id,
  );
  const legacyAnnotations = (annotations ?? []).filter(
    (a) => a.task_id === null && (a.coder_id === task.coder_a_id || a.coder_id === task.coder_b_id),
  );

  return NextResponse.json({
    data: {
      task,
      annotations: taskAnnotations.length > 0 ? taskAnnotations : legacyAnnotations,
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
    return NextResponse.json({ error: "仅管理员和组长可修改任务" }, { status: 403 });
  }

  const body = await request.json();
  const { data, error } = await updateTask(supabase, params.id, body);
  if (error) return NextResponse.json({ error: "更新失败" }, { status: 500 });

  return NextResponse.json({ success: true, data });
}
