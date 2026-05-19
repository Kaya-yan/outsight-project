import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listTasks, createTask } from "@/lib/data-access/coding-tasks";
import { getProfileById } from "@/lib/data-access/profiles";
import { canManageTasks } from "@/lib/auth/research-role";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const my = searchParams.get("my") === "1";
  const pool = searchParams.get("pool") === "1";
  const status = searchParams.get("status") ?? undefined;
  const taskType = searchParams.get("task_type") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

  const filters: Parameters<typeof listTasks>[1] = { page, pageSize };
  if (status) filters.status = status;
  if (taskType) filters.taskType = taskType;
  if (pool) filters.pool = true;
  if (my) filters.coderId = user.id;

  const { data, error, count } = await listTasks(supabase, filters);
  if (error) return NextResponse.json({ error: "查询失败" }, { status: 500 });

  return NextResponse.json({ data, total: count ?? 0, page, pageSize });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: profile } = await getProfileById(supabase, user.id);
  if (!profile) return NextResponse.json({ error: "身份验证失败" }, { status: 403 });

  // Research role guard
  if (!canManageTasks(profile)) {
    return NextResponse.json({ error: "需要 team_lead 研究角色才能创建任务" }, { status: 403 });
  }

  const body = await request.json();
  const { article_id, task_type, coder_a_id, coder_b_id, framework_id, reviewer_id, priority, due_date, notes } = body;

  // Validate required fields
  if (!article_id || !task_type) {
    return NextResponse.json({ error: "article_id 和 task_type 为必填项" }, { status: 400 });
  }

  if (!["solo", "dual"].includes(task_type)) {
    return NextResponse.json({ error: "task_type 必须为 solo 或 dual" }, { status: 400 });
  }

  // Normalize empty strings to null for UUID fields
  const normalizedCoderA = coder_a_id && coder_a_id.trim() ? coder_a_id.trim() : null;
  const normalizedCoderB = coder_b_id && coder_b_id.trim() ? coder_b_id.trim() : null;
  const normalizedReviewer = reviewer_id && reviewer_id.trim() ? reviewer_id.trim() : null;

  if (task_type === "dual" && !normalizedCoderB) {
    return NextResponse.json({ error: "双人编码需同时指定编码员B" }, { status: 400 });
  }

  if (task_type === "dual" && normalizedCoderA === normalizedCoderB) {
    return NextResponse.json({ error: "两个编码员不能相同" }, { status: 400 });
  }

  const payload = {
    article_id,
    task_type,
    coder_a_id: normalizedCoderA,
    coder_b_id: normalizedCoderB,
    framework_id: framework_id || null,
    reviewer_id: normalizedReviewer,
    priority: priority ?? 0,
    due_date: due_date || null,
    notes: notes || null,
    created_by: user.id,
  };

  console.log("[POST /api/tasks] Creating task:", JSON.stringify({
    auth_uid: user.id,
    research_roles: profile.research_roles,
    payload,
  }));

  const { data, error } = await createTask(supabase, payload);

  if (error) {
    const errObj = error as Record<string, unknown>;
    console.error("[POST /api/tasks] CREATE FAILED", JSON.stringify({
      auth_uid: user.id,
      code: errObj.code,
      message: errObj.message,
      details: errObj.details,
      hint: errObj.hint,
      payload,
    }, null, 2));
    const detail = errObj.details ? ` (${errObj.details})` : "";
    const hint = errObj.hint ? ` 提示: ${errObj.hint}` : "";
    const msg = `${errObj.message ?? "未知错误"}${detail}${hint}`;
    return NextResponse.json({ error: msg, code: errObj.code ?? "UNKNOWN" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
