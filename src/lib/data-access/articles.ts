import type { Client, QueryResult, PaginationParams } from "./base";
import { normalizePagination, typedInsert, typedUpdate } from "./base";
import type { Article, ArticleStatus, Database } from "@/types/database";

export async function getArticleById(client: Client, id: string): Promise<QueryResult<Article>> {
  const { data, error } = await client.from("articles").select("*").eq("id", id).single();
  return { data, error };
}

export interface ArticleListFilters {
  source?: string;
  media?: string;
  sourceType?: string;
  language?: string;
  isArchived?: boolean;
  status?: string;
  fullTextStatus?: string[];
  period?: string;
  keywordCombo?: string;
  createdBy?: string;
  search?: string;
}

export async function listArticles(
  client: Client,
  opts?: ArticleListFilters & PaginationParams,
) {
  const { from, to } = normalizePagination(opts);
  let query = client.from("articles").select("*", { count: "exact" });

  if (opts?.source) {
    query = query.eq("source", opts.source);
  } else {
    // Exclude domestic media from English corpus by default
    query = query.neq("source", "domestic_media");
  }
  if (opts?.media) query = query.eq("media", opts.media);
  if (opts?.sourceType) query = query.eq("source_type", opts.sourceType);
  if (opts?.language) query = query.eq("language", opts.language);
  if (opts?.isArchived !== undefined) query = query.eq("is_archived", opts.isArchived);
  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.period) query = query.eq("period", opts.period);
  if (opts?.createdBy) query = query.eq("created_by", opts.createdBy);

  if (opts?.fullTextStatus && opts.fullTextStatus.length > 0) {
    query = query.in("full_text_status", opts.fullTextStatus);
  }

  if (opts?.search) {
    const like = `*${opts.search}*`;
    query = query.or(`title.ilike.${like},abstract.ilike.${like},content.ilike.${like}`);
  }

  const { data, error, count } = await query
    .order("publish_date", { ascending: false })
    .range(from, to);

  return { data, error, count };
}

export type CreateArticleInput = Database["public"]["Tables"]["articles"]["Insert"];

export async function createArticle(
  client: Client,
  input: CreateArticleInput,
): Promise<QueryResult<Article>> {
  const { data, error } = await typedInsert(client, "articles", input).select().single();
  return { data, error };
}

export async function updateArticle(
  client: Client,
  id: string,
  input: Database["public"]["Tables"]["articles"]["Update"],
): Promise<QueryResult<Article>> {
  const { data, error } = await typedUpdate(client, "articles", input).eq("id", id).select().single();
  return { data, error };
}

export async function deleteArticle(client: Client, id: string): Promise<QueryResult<null>> {
  console.log(`[DataAccess] deleteArticle called: id=${id}`);
  const query = client.from("articles").delete().eq("id", id);
  const { data, error } = await query;

  if (error) {
    console.error(`[DataAccess] deleteArticle FAILED: id=${id}`, {
      code: (error as unknown as Record<string, unknown>)?.code,
      message: (error as unknown as Record<string, unknown>)?.message,
      details: (error as unknown as Record<string, unknown>)?.details,
      hint: (error as unknown as Record<string, unknown>)?.hint,
      full: JSON.stringify(error),
    });
  } else {
    console.log(`[DataAccess] deleteArticle SUCCESS: id=${id}, data=`, data);
  }

  return { data, error };
}

export async function bulkArchiveArticles(client: Client, ids: string[]): Promise<QueryResult<null>> {
  const { data, error } = await typedUpdate(client, "articles", {
    is_archived: true,
    archived_at: new Date().toISOString(),
  }).in("id", ids);
  return { data, error };
}

export async function bulkUpdateStatus(
  client: Client,
  ids: string[],
  status: ArticleStatus,
): Promise<QueryResult<null>> {
  const { data, error } = await typedUpdate(client, "articles", {
    status,
  }).in("id", ids);
  return { data, error };
}
