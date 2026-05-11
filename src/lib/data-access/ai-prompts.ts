import type { Client, QueryResult, PaginationParams } from "./base";
import { normalizePagination, typedInsert, typedUpdate } from "./base";
import type { AiPrompt } from "@/types/database";

export async function getPromptById(client: Client, id: string): Promise<QueryResult<AiPrompt>> {
  const { data, error } = await client.from("ai_prompts").select("*").eq("id", id).single();
  return { data, error };
}

export async function getPromptByName(client: Client, name: string): Promise<QueryResult<AiPrompt>> {
  const { data, error } = await client.from("ai_prompts").select("*").eq("name", name).single();
  return { data, error };
}

export async function listActivePrompts(client: Client, jobType?: string) {
  let query = client.from("ai_prompts").select("*").eq("is_active", true);
  if (jobType) query = query.eq("job_type", jobType);
  const { data, error } = await query;
  return { data, error };
}

export async function listPrompts(client: Client, opts?: PaginationParams) {
  const { from, to } = normalizePagination(opts);
  const { data, error } = await client
    .from("ai_prompts")
    .select("*")
    .order("name", { ascending: true })
    .range(from, to);
  return { data, error };
}

export async function createPrompt(
  client: Client,
  input: {
    name: string;
    job_type: string;
    system_prompt: string;
    user_prompt_template: string;
    description?: string;
    variables?: unknown[];
    model?: string;
    temperature?: number;
    max_tokens?: number;
    created_by?: string;
  },
): Promise<QueryResult<AiPrompt>> {
  const { data, error } = await typedInsert(client, "ai_prompts", input).select().single();
  return { data, error };
}

export async function updatePrompt(
  client: Client,
  id: string,
  input: Partial<AiPrompt>,
): Promise<QueryResult<AiPrompt>> {
  const { data, error } = await typedUpdate(client, "ai_prompts", input).eq("id", id).select().single();
  return { data, error };
}
