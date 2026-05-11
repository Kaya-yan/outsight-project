import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export function normalizePagination(params?: PaginationParams) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to, page, pageSize };
}

export type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

/**
 * Typed insert helper. Works around Supabase JS client PostgrestFilterBuilder
 * type inference edge case where Insert generic resolves to never[].
 */
export function typedInsert<T extends keyof Database["public"]["Tables"]>(
  client: Client,
  table: T,
  input: Database["public"]["Tables"][T]["Insert"],
) {
  return client.from(table).insert(input as never);
}

/**
 * Typed update helper. Same workaround as typedInsert.
 */
export function typedUpdate<T extends keyof Database["public"]["Tables"]>(
  client: Client,
  table: T,
  input: Database["public"]["Tables"][T]["Update"],
) {
  return client.from(table).update(input as never);
}

export type { Client };
