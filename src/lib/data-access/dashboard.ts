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

export async function getDashboardStats(client: Client): Promise<DashboardStats> {
  const [
    totalRes,
    byStatusRes,
    byMediaRes,
    byPeriodRes,
    recentArticlesRes,
    recentActivityRes,
  ] = await Promise.all([
    client.from("articles").select("*", { count: "exact", head: true }).eq("is_archived", false),
    client.from("articles").select("status").eq("is_archived", false).limit(50000),
    client.from("articles").select("media").eq("is_archived", false).limit(50000),
    client.from("articles").select("period").eq("is_archived", false).not("period", "is", null).limit(50000),
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
  if (byStatusRes.data) {
    for (const row of byStatusRes.data) {
      const s = row.status as string;
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }
  }

  const byMedia: Record<string, number> = {};
  if (byMediaRes.data) {
    for (const row of byMediaRes.data) {
      const m = row.media as string;
      byMedia[m] = (byMedia[m] ?? 0) + 1;
    }
  }

  const byPeriod: Record<string, number> = {};
  if (byPeriodRes.data) {
    for (const row of byPeriodRes.data) {
      const p = row.period as string;
      byPeriod[p] = (byPeriod[p] ?? 0) + 1;
    }
  }

  return {
    totalArticles: totalRes.count ?? 0,
    byStatus,
    byMedia,
    byPeriod,
    recentArticles: (recentArticlesRes.data ?? []) as DashboardStats["recentArticles"],
    recentActivity: (recentActivityRes.data ?? []) as DashboardStats["recentActivity"],
  };
}
