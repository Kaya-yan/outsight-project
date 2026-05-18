import type { Client, QueryResult } from "./base";
import { typedInsert, typedUpdate } from "./base";
import type { Annotation } from "@/types/database";

export async function getAnnotationById(client: Client, id: string): Promise<QueryResult<Annotation>> {
  const { data, error } = await client.from("annotations").select("*").eq("id", id).single();
  return { data, error };
}

export async function listAnnotationsByArticle(client: Client, articleId: string) {
  const { data, error } = await client
    .from("annotations")
    .select("*")
    .eq("article_id", articleId)
    .order("created_at", { ascending: true });
  return { data, error };
}

export async function listAnnotationsByCoder(client: Client, coderId: string, resolved?: boolean) {
  let query = client.from("annotations").select("*").eq("coder_id", coderId);
  if (resolved !== undefined) query = query.eq("is_resolved", resolved);
  const { data, error } = await query;
  return { data, error };
}

export async function createAnnotation(
  client: Client,
  input: {
    article_id: string;
    node_id: string;
    coder_id: string;
    task_id?: string | null;
    quote_text?: string;
    start_offset?: number;
    end_offset?: number;
    note?: string;
    confidence?: number;
  },
): Promise<QueryResult<Annotation>> {
  const { data, error } = await typedInsert(client, "annotations", input).select().single();
  return { data, error };
}

export async function updateAnnotation(
  client: Client,
  id: string,
  input: Partial<Annotation>,
): Promise<QueryResult<Annotation>> {
  const { data, error } = await typedUpdate(client, "annotations", input).eq("id", id).select().single();
  return { data, error };
}

export async function deleteAnnotation(client: Client, id: string): Promise<QueryResult<null>> {
  const { data, error } = await client.from("annotations").delete().eq("id", id);
  return { data, error };
}

export async function batchCreateAnnotations(
  client: Client,
  annotations: Array<{
    article_id: string;
    node_id: string;
    coder_id: string;
    task_id?: string | null;
    quote_text?: string;
    start_offset?: number;
    end_offset?: number;
    note?: string;
    confidence?: number;
  }>,
): Promise<QueryResult<Annotation[]>> {
  const { data, error } = await typedInsert(client, "annotations", annotations as never[]).select();
  return { data, error };
}
