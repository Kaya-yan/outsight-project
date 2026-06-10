import type { Client } from "./base";

export interface DashboardStats {
  totalArticles: number;
  byStatus: Record<string, number>;
  byMedia: Record<string, number>;
  byPeriod: Record<string, number>;
  recentArticles: Array<{
    id: string;
    title: string;
    media: string;
    status: string;
    publish_date: string | null;
    created_at: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entity_type: string;
    created_at: string;
    profiles: { username: string; display_name: string | null } | null;
  }>;
}

/**
 * Paginated fetch — bypasses PostgREST max-rows (default 1000).
 * Takes a factory that returns a fresh Supabase query builder each call.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll<T>(factory: () => any): Promise<T[]> {
  const PAGE = 1000;
  let offset = 0;
  const all: T[] = [];
  while (true) {
    const { data, error } = await factory().range(offset, offset + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

export async function getDashboardStats(client: Client): Promise<DashboardStats> {
  // Total count uses count:"exact" (server-side, no row limit)
  const { count } = await client
    .from("articles")
    .select("*", { count: "exact", head: true })
    .eq("is_archived", false);

  // Paginated fetches for aggregation (bypasses PostgREST max-rows)
  const [allStatus, allMedia, allPeriod] = await Promise.all([
    fetchAll<{ status: string | null }>(() =>
      client.from("articles").select("status").eq("is_archived", false),
    ),
    fetchAll<{ media: string | null }>(() =>
      client.from("articles").select("media").eq("is_archived", false),
    ),
    fetchAll<{ period: string | null }>(() =>
      client.from("articles").select("period").eq("is_archived", false).not("period", "is", null),
    ),
  ]);

  // Recent articles & activity (small fixed limit, no pagination needed)
  const [recentArticlesRes, recentActivityRes] = await Promise.all([
    client.from("articles")
      .select("id, title, media, status, publish_date, created_at")
      .eq("is_archived", false)
      .limit(5)
      .order("created_at", { ascending: false }),
    client.from("activity_logs")
      .select("id, action, entity_type, created_at, profiles(username, display_name)")
      .limit(5)
      .order("created_at", { ascending: false }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of allStatus) {
    const s = row.status ?? "unknown";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }

  const byMedia: Record<string, number> = {};
  for (const row of allMedia) {
    const m = row.media ?? "unknown";
    byMedia[m] = (byMedia[m] ?? 0) + 1;
  }

  const byPeriod: Record<string, number> = {};
  for (const row of allPeriod) {
    const p = row.period ?? "unknown";
    byPeriod[p] = (byPeriod[p] ?? 0) + 1;
  }

  return {
    totalArticles: count ?? 0,
    byStatus,
    byMedia,
    byPeriod,
    recentArticles: (recentArticlesRes.data ?? []) as DashboardStats["recentArticles"],
    recentActivity: (recentActivityRes.data ?? []) as DashboardStats["recentActivity"],
  };
}
