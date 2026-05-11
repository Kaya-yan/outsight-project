import type { Client, QueryResult } from "./base";
import { typedInsert, typedUpdate } from "./base";
import type { Assignment } from "@/types/database";

export async function getAssignmentById(client: Client, id: string): Promise<QueryResult<Assignment>> {
  const { data, error } = await client.from("assignments").select("*").eq("id", id).single();
  return { data, error };
}

export async function listAssignmentsByAssignee(
  client: Client,
  assigneeId: string,
  status?: "assigned" | "in_progress" | "completed" | "reviewed" | "disputed",
) {
  let query = client
    .from("assignments")
    .select("*, articles(title, source, publish_date)")
    .eq("assignee_id", assigneeId);
  if (status) query = query.eq("status", status);
  const { data, error } = await query.order("created_at", { ascending: false });
  return { data, error };
}

export async function listAssignmentsByArticle(client: Client, articleId: string) {
  const { data, error } = await client.from("assignments").select("*").eq("article_id", articleId);
  return { data, error };
}

export async function createAssignment(
  client: Client,
  input: {
    article_id: string;
    assignee_id: string;
    assigned_by: string;
    status?: "assigned" | "in_progress" | "completed" | "reviewed" | "disputed";
    priority?: number;
    due_date?: string;
    note?: string;
  },
): Promise<QueryResult<Assignment>> {
  const { data, error } = await typedInsert(client, "assignments", input).select().single();
  return { data, error };
}

export async function updateAssignment(
  client: Client,
  id: string,
  input: Partial<Assignment>,
): Promise<QueryResult<Assignment>> {
  const { data, error } = await typedUpdate(client, "assignments", input).eq("id", id).select().single();
  return { data, error };
}
