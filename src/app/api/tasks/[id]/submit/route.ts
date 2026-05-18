import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitCoderDone } from "@/lib/data-access/coding-tasks";
import { listAnnotationsByArticle } from "@/lib/data-access/annotations";
import { listNodesByFramework } from "@/lib/data-access/coding-nodes";
import { listActiveFrameworks } from "@/lib/data-access/coding-frameworks";
import { calcAgreement } from "@/lib/stats/agreement";
import { updateTask } from "@/lib/data-access/coding-tasks";
import { getArticleById, updateArticle } from "@/lib/data-access/articles";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const taskId = params.id;

  // 1. Mark coder done
  const { data: task, error } = await submitCoderDone(supabase, taskId, user.id);
  if (error) return NextResponse.json({ error: typeof error === "string" ? error : "提交失败" }, { status: 400 });
  if (!task) return NextResponse.json({ error: "任务不存在" }, { status: 404 });

  // 2. Auto-update article status when task completes
  if (task.status === "completed") {
    const { data: article } = await getArticleById(supabase, task.article_id);
    if (article && (article.status === "待编码" || article.status === "已预读")) {
      await updateArticle(supabase, task.article_id, { status: "编码完成" });
    }
  }

  // 3. For dual tasks: calculate agreement when both are done
  let agreementResult = null;
  if (task.task_type === "dual" && task.status === "completed" && task.agreement_rate === null) {
    const { data: allAnnotations } = await listAnnotationsByArticle(supabase, task.article_id);
    if (allAnnotations) {
      const aAnnotations = allAnnotations.filter(
        (a) => a.coder_id === task.coder_a_id && (a.task_id === task.id || a.task_id === null),
      );
      const bAnnotations = allAnnotations.filter(
        (a) => a.coder_id === task.coder_b_id && (a.task_id === task.id || a.task_id === null),
      );

      const { data: frameworks } = await listActiveFrameworks(supabase);
      const allNodes: unknown[] = [];
      if (frameworks) {
        for (const fw of frameworks) {
          const { data: nodes } = await listNodesByFramework(supabase, fw.id);
          if (nodes) allNodes.push(...nodes);
        }
      }

      if (aAnnotations.length > 0 && bAnnotations.length > 0) {
        const result = calcAgreement(aAnnotations, bAnnotations, allNodes as never[]);
        agreementResult = {
          agreementRate: result.agreementRate,
          kappa: result.kappa,
          level1Rate: result.level1Rate,
          level2Rate: result.level2Rate,
          matchedCount: result.matchedCount,
          totalPairs: result.totalPairs,
        };

        await updateTask(supabase, taskId, {
          agreement_rate: Math.round(result.agreementRate * 1000) / 1000,
          kappa: Math.round(result.kappa * 1000) / 1000,
        });
      }
    }
  }

  return NextResponse.json({
    success: true,
    task,
    agreement: agreementResult,
  });
}
