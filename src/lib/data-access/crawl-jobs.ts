import type { Client, QueryResult } from "./base";
import { typedInsert, typedUpdate } from "./base";
import type { Database } from "@/types/database";

type CrawlJob = Database["public"]["Tables"]["crawl_jobs"]["Row"];

export type CrawlJobStatus = CrawlJob["status"];

export async function createCrawlJob(
  client: Client,
  input: {
    query_params?: Record<string, unknown>;
    triggered_by?: string;
  },
): Promise<QueryResult<CrawlJob>> {
  const { data, error } = await typedInsert(client, "crawl_jobs", {
    status: "pending",
    progress: 0,
    total_fetched: 0,
    total_new: 0,
    batch_index: 0,
    batch_total: 0,
    query_params: input.query_params ?? {},
    triggered_by: input.triggered_by,
  }).select().single();
  return { data, error };
}

export async function getCrawlJob(
  client: Client,
  id: string,
): Promise<QueryResult<CrawlJob>> {
  const { data, error } = await client
    .from("crawl_jobs")
    .select("*")
    .eq("id", id)
    .single();
  return { data, error };
}

export async function updateCrawlJob(
  client: Client,
  id: string,
  input: Database["public"]["Tables"]["crawl_jobs"]["Update"],
): Promise<QueryResult<null>> {
  const { data, error } = await typedUpdate(client, "crawl_jobs", input).eq("id", id);
  return { data, error };
}

/** Advance to the next batch index and update progress percentage. */
export async function advanceBatch(
  client: Client,
  jobId: string,
  batchIndex: number,
  batchTotal: number,
): Promise<void> {
  const progress = batchTotal > 0 ? Math.round(((batchIndex + 1) / batchTotal) * 95) : 0;
  await updateCrawlJob(client, jobId, {
    batch_index: batchIndex + 1,
    progress: Math.min(progress, 95),
  });
}

/** Increment total_fetched count atomically. Call after each batch discovers articles. */
export async function addFetchedCount(
  client: Client,
  jobId: string,
  count: number,
): Promise<void> {
  // Read current, add, write back
  const { data } = await getCrawlJob(client, jobId);
  if (data) {
    await updateCrawlJob(client, jobId, {
      total_fetched: (data.total_fetched ?? 0) + count,
    });
  }
}

/** Increment total_new count atomically. Call after each batch inserts articles. */
export async function addInsertedCount(
  client: Client,
  jobId: string,
  count: number,
): Promise<void> {
  const { data } = await getCrawlJob(client, jobId);
  if (data) {
    await updateCrawlJob(client, jobId, {
      total_new: (data.total_new ?? 0) + count,
    });
  }
}
