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
