import type { Client, QueryResult, PaginationParams } from "./base";
import { normalizePagination, typedInsert, typedUpdate } from "./base";
import type { CollectionLog } from "@/types/database";

export async function listCollectionLogs(client: Client, opts?: { batchId?: string } & PaginationParams) {
  const { from, to } = normalizePagination(opts);
  let query = client.from("collection_logs").select("*").order("started_at", { ascending: false });
  if (opts?.batchId) query = query.eq("batch_id", opts.batchId);
  const { data, error } = await query.range(from, to);
  return { data, error };
}

export async function createCollectionLog(
  client: Client,
  input: {
    batch_id: string;
    source: string;
    query_params?: Record<string, unknown>;
    articles_fetched?: number;
    articles_new?: number;
    status?: "running" | "completed" | "failed" | "partial";
    triggered_by?: string;
  },
): Promise<QueryResult<CollectionLog>> {
  const { data, error } = await typedInsert(client, "collection_logs", input).select().single();
  return { data, error };
}

export async function getLatestCollectionLog(client: Client): Promise<QueryResult<CollectionLog>> {
  const { data, error } = await client
    .from("collection_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();
  return { data, error };
}

export async function updateCollectionLog(
  client: Client,
  id: string,
  input: {
    articles_fetched?: number;
    articles_new?: number;
    status?: "running" | "completed" | "failed" | "partial";
    error_message?: string;
    completed_at?: string;
  },
): Promise<QueryResult<null>> {
  const { data, error } = await typedUpdate(client, "collection_logs", {
    ...input,
    ...(input.status === "completed" || input.status === "failed"
      ? { completed_at: new Date().toISOString() }
      : {}),
  }).eq("id", id);
  return { data, error };
}
