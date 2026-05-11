import type { Client, QueryResult, PaginationParams } from "./base";
import { normalizePagination, typedInsert } from "./base";
import type { ActivityLog } from "@/types/database";

export async function listActivityLogs(
  client: Client,
  opts?: { userId?: string; action?: string; entityType?: string } & PaginationParams,
) {
  const { from, to } = normalizePagination(opts);
  let query = client.from("activity_logs").select("*").order("created_at", { ascending: false });
  if (opts?.userId) query = query.eq("user_id", opts.userId);
  if (opts?.action) query = query.eq("action", opts.action);
  if (opts?.entityType) query = query.eq("entity_type", opts.entityType);
  const { data, error } = await query.range(from, to);
  return { data, error };
}

export async function logActivity(
  client: Client,
  input: {
    user_id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    details?: Record<string, unknown>;
  },
): Promise<QueryResult<ActivityLog>> {
  const { data, error } = await typedInsert(client, "activity_logs", input).select().single();
  return { data, error };
}
