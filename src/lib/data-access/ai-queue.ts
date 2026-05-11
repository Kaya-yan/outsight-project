import type { Client, QueryResult, PaginationParams } from "./base";
import { normalizePagination, typedInsert, typedUpdate } from "./base";
import type { AiJob } from "@/types/database";

export async function listAiJobs(
  client: Client,
  opts?: {
    status?: "pending" | "processing" | "completed" | "failed" | "cancelled";
    jobType?: "summarize" | "classify" | "sentiment" | "extract_entities" | "suggest_codes" | "translate" | "qa";
  } & PaginationParams,
) {
  const { from, to } = normalizePagination(opts);
  let query = client.from("ai_queue").select("*").order("created_at", { ascending: false });
  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.jobType) query = query.eq("job_type", opts.jobType);
  const { data, error } = await query.range(from, to);
  return { data, error };
}

export async function getAiJobById(client: Client, id: string): Promise<QueryResult<AiJob>> {
  const { data, error } = await client.from("ai_queue").select("*").eq("id", id).single();
  return { data, error };
}

export async function enqueueJob(
  client: Client,
  input: {
    job_type: AiJob["job_type"];
    payload: Record<string, unknown>;
    priority?: number;
    model?: string;
    created_by?: string;
  },
): Promise<QueryResult<AiJob>> {
  const { data, error } = await typedInsert(client, "ai_queue", input).select().single();
  return { data, error };
}

export async function updateJobStatus(
  client: Client,
  id: string,
  input: {
    status: AiJob["status"];
    result?: Record<string, unknown>;
    tokens_used?: number;
    error_message?: string;
    retry_count?: number;
  },
): Promise<QueryResult<AiJob>> {
  const updates: Record<string, unknown> = { status: input.status };
  if (input.result !== undefined) updates.result = input.result;
  if (input.tokens_used !== undefined) updates.tokens_used = input.tokens_used;
  if (input.error_message !== undefined) updates.error_message = input.error_message;
  if (input.retry_count !== undefined) updates.retry_count = input.retry_count;
  if (input.status === "processing") updates.started_at = new Date().toISOString();
  if (input.status === "completed" || input.status === "failed")
    updates.completed_at = new Date().toISOString();

  const { data, error } = await typedUpdate(client, "ai_queue", updates).eq("id", id).select().single();
  return { data, error };
}
