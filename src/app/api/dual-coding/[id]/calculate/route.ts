import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRoundById, updateRound } from "@/lib/data-access/dual-coding-rounds";
import { listAnnotationsByArticle } from "@/lib/data-access/annotations";
import { listNodesByFramework } from "@/lib/data-access/coding-nodes";
import { listActiveFrameworks } from "@/lib/data-access/coding-frameworks";
import { calcAgreement } from "@/lib/stats/agreement";
import { getProfileById } from "@/lib/data-access/profiles";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: profile } = await getProfileById(supabase, user.id);
  if (!profile || (profile.role !== "admin" && profile.role !== "lead_researcher")) {
    return NextResponse.json({ error: "仅管理员和组长可触发计算" }, { status: 403 });
  }

  const { data: round } = await getRoundById(supabase, params.id);
  if (!round) return NextResponse.json({ error: "未找到该轮次" }, { status: 404 });

  // Get annotations for both coders
  const { data: allAnnotations } = await listAnnotationsByArticle(supabase, round.article_id);
  if (!allAnnotations) {
    return NextResponse.json({ error: "无标注数据" }, { status: 400 });
  }

  const coderAAnnotations = allAnnotations.filter((a) => a.coder_id === round.coder_a_id);
  const coderBAnnotations = allAnnotations.filter((a) => a.coder_id === round.coder_b_id);

  if (coderAAnnotations.length === 0 || coderBAnnotations.length === 0) {
    return NextResponse.json({ error: "两名编码员均需完成标注后才可以计算" }, { status: 400 });
  }

  // Get all framework nodes
  const { data: frameworks } = await listActiveFrameworks(supabase);
  const allNodes = [];
  if (frameworks) {
    for (const fw of frameworks) {
      const { data: nodes } = await listNodesByFramework(supabase, fw.id);
      if (nodes) allNodes.push(...nodes);
    }
  }

  // Calculate agreement
  const result = calcAgreement(coderAAnnotations, coderBAnnotations, allNodes);

  // Update round
  const threshold = 0.8;
  const newStatus = result.agreementRate < threshold ? "disputed" : "arbitrated";

  await updateRound(supabase, params.id, {
    agreement_rate: Math.round(result.agreementRate * 1000) / 1000,
    kappa: Math.round(result.kappa * 1000) / 1000,
    status: newStatus,
    ...(newStatus === "arbitrated" ? { arbiter_id: user.id } : {}),
  });

  return NextResponse.json({
    success: true,
    result: {
      agreementRate: result.agreementRate,
      level1Rate: result.level1Rate,
      level2Rate: result.level2Rate,
      kappa: result.kappa,
      matchedCount: result.matchedCount,
      totalPairs: result.totalPairs,
      coderAOnly: result.coderAOnly,
      coderBOnly: result.coderBOnly,
    },
    status: newStatus,
    needsArbitration: newStatus === "disputed",
  });
}
