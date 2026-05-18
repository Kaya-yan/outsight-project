import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listTasks, createTask } from "@/lib/data-access/coding-tasks";
import { getProfileById } from "@/lib/data-access/profiles";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const my = searchParams.get("my") === "1";
  const status = searchParams.get("status") ?? undefined;
  const taskType = searchParams.get("task_type") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);

  const filters: Parameters<typeof listTasks>[1] = { page, pageSize };
  if (status) filters.status = status;
  if (taskType) filters.taskType = taskType;
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
  if (!profile || (profile.role !== "admin" && profile.role !== "lead_researcher")) {
    return NextResponse.json({ error: "仅管理员和组长可创建任务" }, { status: 403 });
  }

  const body = await request.json();
  const { article_id, task_type, coder_a_id, coder_b_id, framework_id, reviewer_id, priority, due_date, notes } = body;

  if (!article_id || !task_type || !coder_a_id) {
    return NextResponse.json({ error: "article_id, task_type, coder_a_id 为必填项" }, { status: 400 });
  }

  if (!["solo", "dual"].includes(task_type)) {
    return NextResponse.json({ error: "task_type 必须为 solo 或 dual" }, { status: 400 });
  }

  if (task_type === "dual" && !coder_b_id) {
    return NextResponse.json({ error: "双人编码需指定 coder_b_id" }, { status: 400 });
  }

  if (task_type === "dual" && coder_a_id === coder_b_id) {
    return NextResponse.json({ error: "两个编码员不能相同" }, { status: 400 });
  }

  const { data, error } = await createTask(supabase, {
    article_id,
    task_type,
    coder_a_id,
    coder_b_id: coder_b_id ?? null,
    framework_id: framework_id ?? null,
    reviewer_id: reviewer_id ?? null,
    priority: priority ?? 0,
    due_date: due_date ?? null,
    notes: notes ?? null,
    created_by: user.id,
  });

  if (error) {
    const msg = typeof error === "object" && error !== null
      ? ((error as Record<string, unknown>).message || JSON.stringify(error))
      : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}
