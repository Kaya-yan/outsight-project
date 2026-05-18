import type { Client, QueryResult, PaginationParams } from "./base";
import { normalizePagination, typedInsert, typedUpdate } from "./base";
import type { CodingTask } from "@/types/database";

// ── queries ──

export async function getTaskById(client: Client, id: string): Promise<QueryResult<CodingTask>> {
  const { data, error } = await client.from("coding_tasks").select("*").eq("id", id).single();
  return { data, error };
}

export interface TaskListFilters {
  coderId?: string;   // match coder_a_id OR coder_b_id
  status?: string;
  taskType?: string;
  reviewerId?: string;
  pool?: boolean;       // tasks in the pool (coder_a_id IS NULL, status = 'open')
  my?: boolean;         // shorthand: tasks assigned to current user
}

export async function listTasks(
  client: Client,
  opts?: TaskListFilters & PaginationParams,
) {
  const { from, to } = normalizePagination(opts);

  let query = client.from("coding_tasks").select("*, articles(title, media, period, status, word_count)", { count: "exact" });

  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.taskType) query = query.eq("task_type", opts.taskType);
  if (opts?.reviewerId) query = query.eq("reviewer_id", opts.reviewerId);
  if (opts?.pool) query = query.is("coder_a_id", null).eq("status", "open");

  if (opts?.coderId) {
    query = query.or(`coder_a_id.eq.${opts.coderId},coder_b_id.eq.${opts.coderId}`);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  return { data, error, count };
}

// ── mutations ──

export interface CreateTaskInput {
  article_id: string;
  task_type: "solo" | "dual";
  coder_a_id?: string | null;  // nullable = task goes to pool
  coder_b_id?: string | null;
  framework_id?: string | null;
  reviewer_id?: string | null;
  priority?: number;
  due_date?: string | null;
  notes?: string | null;
  created_by: string;
}

export async function createTask(
  client: Client,
  input: CreateTaskInput,
): Promise<QueryResult<CodingTask>> {
  const { data, error } = await typedInsert(client, "coding_tasks", input).select().single();
  return { data, error };
}

export async function updateTask(
  client: Client,
  id: string,
  input: Partial<CodingTask>,
): Promise<QueryResult<CodingTask>> {
  const { data, error } = await typedUpdate(client, "coding_tasks", input).eq("id", id).select().single();
  return { data, error };
}

// ── task actions ──

/**
 * Coder submits their part.
 * - Sets coder_a_done or coder_b_done based on caller identity
 * - For solo: marks completed immediately
 * - For dual: if both done, marks completed and returns flag to calculate agreement
 */
export async function submitCoderDone(
  client: Client,
  taskId: string,
  coderId: string,
): Promise<QueryResult<CodingTask>> {
  // Fetch current task
  const { data: task } = await getTaskById(client, taskId);
  if (!task) return { data: null, error: "Task not found" };

  const isCoderA = task.coder_a_id === coderId;
  const isCoderB = task.coder_b_id === coderId;

  if (!isCoderA && !isCoderB) {
    return { data: null, error: "You are not assigned to this task" };
  }

  const update: Record<string, unknown> = {};
  if (isCoderA) update.coder_a_done = true;
  if (isCoderB) update.coder_b_done = true;

  // Determine new status
  if (task.task_type === "solo") {
    update.status = "completed";
  } else if (task.task_type === "dual") {
    const aDone = isCoderA ? true : task.coder_a_done;
    const bDone = isCoderB ? true : task.coder_b_done;
    if (aDone && bDone) {
      update.status = "completed";
    }
  }

  const { data, error } = await typedUpdate(client, "coding_tasks", update as never)
    .eq("id", taskId)
    .select()
    .single();

  return { data, error };
}

/**
 * Claim an unassigned task from the pool.
 * Sets coder_a_id to the claiming user and advances status to in_progress.
 */
export async function claimTask(
  client: Client,
  taskId: string,
  coderId: string,
): Promise<QueryResult<CodingTask>> {
  // Verify task is claimable
  const { data: task } = await getTaskById(client, taskId);
  if (!task) return { data: null, error: "Task not found" };
  if (task.coder_a_id !== null) return { data: null, error: "任务已被认领" };
  if (task.status !== "open") return { data: null, error: "任务不在可认领状态" };

  const { data, error } = await typedUpdate(client, "coding_tasks", {
    coder_a_id: coderId,
    status: "in_progress",
  } as never)
    .eq("id", taskId)
    .select()
    .single();

  return { data, error };
}

/**
 * Reviewer finalises a completed task.
 */
export async function reviewTask(
  client: Client,
  taskId: string,
  reviewerId: string,
  note: string,
): Promise<QueryResult<CodingTask>> {
  const { data, error } = await typedUpdate(client, "coding_tasks", {
    status: "reviewed",
    reviewer_id: reviewerId,
    reviewer_note: note,
    reviewed_at: new Date().toISOString(),
  } as never)
    .eq("id", taskId)
    .select()
    .single();

  return { data, error };
}
