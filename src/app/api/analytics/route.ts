import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listRounds } from "@/lib/data-access/dual-coding-rounds";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  // Parallel queries for all chart data
  const [
    annotationsRes,
    articlesRes,
    roundsRes,
  ] = await Promise.all([
    supabase.from("annotations").select("node_id, coder_id, confidence").limit(50000),
    supabase.from("articles").select("media, period, status").eq("is_archived", false).limit(50000),
    listRounds(supabase),
  ]);

  // Framework distribution: count annotations per node
  const frameworkDist: Record<string, number> = {};
  if (annotationsRes.data) {
    for (const a of annotationsRes.data) {
      frameworkDist[a.node_id] = (frameworkDist[a.node_id] ?? 0) + 1;
    }
  }

  // Media × period cross-tab
  const mediaPeriod: Record<string, Record<string, number>> = {};
  if (articlesRes.data) {
    for (const a of articlesRes.data) {
      const m = a.media ?? "unknown";
      const p = a.period ?? "unknown";
      if (!mediaPeriod[m]) mediaPeriod[m] = {};
      mediaPeriod[m][p] = (mediaPeriod[m][p] ?? 0) + 1;
    }
  }

  // Coder workload
  const coderWorkload: Record<string, number> = {};
  if (annotationsRes.data) {
    for (const a of annotationsRes.data) {
      coderWorkload[a.coder_id] = (coderWorkload[a.coder_id] ?? 0) + 1;
    }
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
      totalAnnotations: annotationsRes.data?.length ?? 0,
      totalArticles: articlesRes.data?.length ?? 0,
      totalRounds: (roundsRes as unknown as { count?: number })?.count ?? 0,
    },
  });
}
