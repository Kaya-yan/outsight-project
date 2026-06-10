import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listRounds } from "@/lib/data-access/dual-coding-rounds";

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

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  // Parallel queries: count uses server-side count:"exact", data uses paginated fetch
  const [
    annotationsCountRes,
    allAnnotations,
    articlesCountRes,
    allArticles,
    roundsRes,
  ] = await Promise.all([
    supabase.from("annotations").select("id", { count: "exact", head: true }),
    fetchAll<{ node_id: string; coder_id: string; confidence: number | null }>(() =>
      supabase.from("annotations").select("node_id, coder_id, confidence"),
    ),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("is_archived", false),
    fetchAll<{ media: string | null; period: string | null; status: string | null }>(() =>
      supabase.from("articles").select("media, period, status").eq("is_archived", false),
    ),
    listRounds(supabase),
  ]);

  // Framework distribution: count annotations per node
  const frameworkDist: Record<string, number> = {};
  for (const a of allAnnotations) {
    frameworkDist[a.node_id] = (frameworkDist[a.node_id] ?? 0) + 1;
  }

  // Media × period cross-tab
  const mediaPeriod: Record<string, Record<string, number>> = {};
  for (const a of allArticles) {
    const m = a.media ?? "unknown";
    const p = a.period ?? "unknown";
    if (!mediaPeriod[m]) mediaPeriod[m] = {};
    mediaPeriod[m][p] = (mediaPeriod[m][p] ?? 0) + 1;
  }

  // Coder workload
  const coderWorkload: Record<string, number> = {};
  for (const a of allAnnotations) {
    coderWorkload[a.coder_id] = (coderWorkload[a.coder_id] ?? 0) + 1;
  }

  // Kappa distribution from dual coding rounds
  const kappaValues = ((roundsRes as unknown as { data?: Array<{ kappa: number | null; status: string }> })?.data ?? [])
    .filter((r) => r.kappa != null)
    .map((r) => r.kappa!);

  return NextResponse.json({
    data: {
      frameworkDistribution: frameworkDist,
      mediaPeriod,
      coderWorkload,
      kappaValues,
      totalAnnotations: annotationsCountRes.count ?? allAnnotations.length,
      totalArticles: articlesCountRes.count ?? allArticles.length,
      totalRounds: (roundsRes as unknown as { count?: number })?.count ?? 0,
    },
  });
}
