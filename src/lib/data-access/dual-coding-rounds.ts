import type { Client, QueryResult, PaginationParams } from "./base";
import { normalizePagination, typedInsert, typedUpdate } from "./base";
import type { DualCodingRound } from "@/types/database";

export async function getRoundById(client: Client, id: string): Promise<QueryResult<DualCodingRound>> {
  const { data, error } = await client.from("dual_coding_rounds").select("*").eq("id", id).single();
  return { data, error };
}

export async function getRoundByArticleId(client: Client, articleId: string): Promise<QueryResult<DualCodingRound>> {
  const { data, error } = await client
    .from("dual_coding_rounds")
    .select("*")
    .eq("article_id", articleId)
    .single();
  return { data, error };
}

export async function listRounds(
  client: Client,
  opts?: { status?: string; coderId?: string } & PaginationParams,
) {
  const { from, to } = normalizePagination(opts);
  let query = client.from("dual_coding_rounds").select("*", { count: "exact" });

  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.coderId) {
    query = query.or(`coder_a_id.eq.${opts.coderId},coder_b_id.eq.${opts.coderId}`);
  }

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  return { data, error, count };
}

export async function createRound(
  client: Client,
  input: {
    article_id: string;
    coder_a_id: string;
    coder_b_id: string;
  },
): Promise<QueryResult<DualCodingRound>> {
  const { data, error } = await typedInsert(client, "dual_coding_rounds", input).select().single();
  return { data, error };
}

export async function updateRound(
  client: Client,
  id: string,
  input: Partial<DualCodingRound>,
): Promise<QueryResult<DualCodingRound>> {
  const { data, error } = await typedUpdate(client, "dual_coding_rounds", input).eq("id", id).select().single();
  return { data, error };
}
