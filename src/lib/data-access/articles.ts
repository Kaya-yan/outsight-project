import type { Client, QueryResult, PaginationParams } from "./base";
import { normalizePagination, typedInsert, typedUpdate } from "./base";
import type { Article, ArticleStatus } from "@/types/database";

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

  if (opts?.source) query = query.eq("source", opts.source);
  if (opts?.media) query = query.eq("media", opts.media);
  if (opts?.sourceType) query = query.eq("source_type", opts.sourceType);
  if (opts?.language) query = query.eq("language", opts.language);
  if (opts?.isArchived !== undefined) query = query.eq("is_archived", opts.isArchived);
  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.period) query = query.eq("period", opts.period);
  if (opts?.createdBy) query = query.eq("created_by", opts.createdBy);

  if (opts?.search) {
    const like = `*${opts.search}*`;
    query = query.or(`title.ilike.${like},abstract.ilike.${like},content.ilike.${like}`);
  }

  const { data, error, count } = await query
    .order("publish_date", { ascending: false })
    .range(from, to);

  return { data, error, count };
}

export interface CreateArticleInput {
  title: string;
  url: string;
  source?: string;
  media?: string;
  source_type?: "mainstream_media" | "social_media" | "academic_journal" | "government" | "other";
  publish_date?: string;
  period?: string;
  language?: "en" | "zh" | "bilingual";
  author?: string;
  abstract?: string;
  full_text?: string;
  full_text_status?: "missing" | "partial" | "complete" | "manual_uploaded";
  url_hash?: string;
  content?: string;
  word_count?: number;
  keywords?: string[];
  keyword_combo?: string[];
  region?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  created_by?: string;
}

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
  input: Partial<Article>,
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
      code: (error as Record<string, unknown>)?.code,
      message: (error as Record<string, unknown>)?.message,
      details: (error as Record<string, unknown>)?.details,
      hint: (error as Record<string, unknown>)?.hint,
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
  } as Partial<Article>).in("id", ids);
  return { data, error };
}

export async function bulkUpdateStatus(
  client: Client,
  ids: string[],
  status: ArticleStatus,
): Promise<QueryResult<null>> {
  const { data, error } = await typedUpdate(client, "articles", {
    status,
  } as Partial<Article>).in("id", ids);
  return { data, error };
}
