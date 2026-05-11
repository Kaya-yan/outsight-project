import type { Client, QueryResult, PaginationParams } from "./base";
import { normalizePagination, typedInsert, typedUpdate } from "./base";
import type { CodingFramework } from "@/types/database";

export async function getFrameworkById(client: Client, id: string): Promise<QueryResult<CodingFramework>> {
  const { data, error } = await client.from("coding_frameworks").select("*").eq("id", id).single();
  return { data, error };
}

export async function listFrameworks(client: Client, opts?: { isActive?: boolean } & PaginationParams) {
  const { from, to } = normalizePagination(opts);
  let query = client.from("coding_frameworks").select("*").order("created_at", { ascending: false });
  if (opts?.isActive !== undefined) query = query.eq("is_active", opts.isActive);
  const { data, error } = await query.range(from, to);
  return { data, error };
}

export async function listActiveFrameworks(client: Client) {
  const { data, error } = await client
    .from("coding_frameworks")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function createFramework(
  client: Client,
  input: { name: string; name_zh?: string; description?: string; created_by?: string },
): Promise<QueryResult<CodingFramework>> {
  const { data, error } = await typedInsert(client, "coding_frameworks", input).select().single();
  return { data, error };
}

export async function updateFramework(
  client: Client,
  id: string,
  input: Partial<CodingFramework>,
): Promise<QueryResult<CodingFramework>> {
  const { data, error } = await typedUpdate(client, "coding_frameworks", input).eq("id", id).select().single();
  return { data, error };
}
