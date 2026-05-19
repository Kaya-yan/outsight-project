"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCodingStore } from "@/stores/coding-store";
import { useTaskStore } from "@/stores/task-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArbitrationView } from "@/components/coding/arbitration-view";
import { useAuthStore, selectCanReview } from "@/stores/auth-store";
import { ArrowLeft, CheckCircle2, XCircle, Calculator } from "lucide-react";
import type { CodingTask, Annotation } from "@/types/database";

export default function ComparePage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const canReview = useAuthStore(selectCanReview);

  const { nodes, loadFrameworkNodes, frameworks, loadFrameworks } = useCodingStore();
  const { loadTaskDetail, reviewTask } = useTaskStore();

  const [task, setTask] = useState<CodingTask | null>(null);
  const [annotationsA, setAnnotationsA] = useState<Annotation[]>([]);
  const [annotationsB, setAnnotationsB] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalcLoading, setIsCalcLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreement, setAgreement] = useState<{
    agreementRate: number;
    level1Rate: number;
    level2Rate: number;
    kappa: number;
    matchedCount: number;
    totalPairs: number;
    coderAOnly: number;
    coderBOnly: number;
  } | null>(null);
  const [calcError, setCalcError] = useState("");

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      // Load from tasks API
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (res.ok) {
          const json = await res.json();
          const t = json.data.task as CodingTask;
          setTask(t);

          // split annotations by coder
          const all = (json.data.annotations ?? []) as Annotation[];
          setAnnotationsA(all.filter((a) => a.coder_id === t.coder_a_id));
          setAnnotationsB(all.filter((a) => a.coder_id === t.coder_b_id));
        }
      } catch {
        // silent
      }
      setIsLoading(false);
      loadFrameworks();
    }
    init();
  }, [taskId, loadFrameworks]);

  useEffect(() => {
    if (frameworks.length > 0) {
      loadFrameworkNodes(frameworks[0].id);
    }
  }, [frameworks, loadFrameworkNodes]);

  async function handleCalculate() {
    if (!taskId) return;
    setIsCalcLoading(true);
    setCalcError("");
    try {
      const res = await fetch(`/api/tasks/${taskId}/submit`, { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        if (json.agreement) {
          setAgreement(json.agreement);
        }
        // Reload task
        const detail = await fetch(`/api/tasks/${taskId}`);
        if (detail.ok) {
          const detailJson = await detail.json();
          setTask(detailJson.data.task);
        }
      } else {
        const json = await res.json();
        setCalcError(json.error ?? "计算失败");
      }
    } catch {
      setCalcError("网络错误");
    }
    setIsCalcLoading(false);
  }

  async function handleArbitrate(_id: string, _resolvedIds: string[], note: string) {
    setIsSubmitting(true);
    const ok = await reviewTask(taskId, note);
    setIsSubmitting(false);
    if (ok) {
      // Reload
      const detail = await fetch(`/api/tasks/${taskId}`);
      if (detail.ok) {
        const json = await detail.json();
        setTask(json.data.task);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-7xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!task || task.task_type !== "dual") {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[#E67E22]">未找到该双编码任务</p>
        <Button onClick={() => router.push("/coding")} variant="outline" className="mt-3 h-8 text-xs">
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          返回
        </Button>
      </div>
    );
  }

  const statusLabel =
    task.status === "open" ? "待开始" :
    task.status === "in_progress" ? "进行中" :
    task.status === "completed" ? "已完成" :
    task.status === "reviewed" ? "已终审" : task.status;

  const agreementFromTask = (task.agreement_rate != null && task.kappa != null)
    ? { agreementRate: task.agreement_rate, kappa: task.kappa }
    : null;

  const displayAgreement = agreement ?? (agreementFromTask ? {
    agreementRate: agreementFromTask.agreementRate,
    kappa: agreementFromTask.kappa,
    level1Rate: 0,
    level2Rate: 0,
    matchedCount: 0,
    totalPairs: 0,
    coderAOnly: 0,
    coderBOnly: 0,
  } : null);

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button onClick={() => router.push("/coding")} variant="ghost" className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-[#2D3436]">
              并排对比 · 双编码仲裁
            </h1>
            {task && (
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className="text-[10px] bg-[#4A90A4]/10 text-[#4A90A4]">
                  {statusLabel}
                </Badge>
                {task.agreement_rate != null && (
                  <span className="text-xs text-[#7F8A93]">
                    一致率 {(task.agreement_rate * 100).toFixed(1)}%
                  </span>
                )}
                {task.kappa != null && (
                  <span className="text-xs text-[#7F8A93]">
                    κ={task.kappa.toFixed(3)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {canReview && task.status === "completed" && !agreementFromTask && (
          <div className="flex gap-2">
            <Button
              onClick={handleCalculate}
              disabled={isCalcLoading}
              className="h-8 text-xs gap-1 bg-[#4A90A4] hover:bg-[#3D7D8F] text-white"
            >
              <Calculator className="h-3.5 w-3.5" />
              {isCalcLoading ? "计算中..." : "计算一致性"}
            </Button>
          </div>
        )}
      </div>

      {calcError && (
        <div className="p-2 text-xs text-[#E67E22] bg-[#E67E22]/5 rounded">{calcError}</div>
      )}

      {/* Agreement Stats */}
      {displayAgreement && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "整体一致率", value: `${(displayAgreement.agreementRate * 100).toFixed(1)}%`, color: displayAgreement.agreementRate >= 0.8 ? "text-[#5DAD93]" : "text-[#E67E22]" },
            { label: "一级节点", value: `${(displayAgreement.level1Rate * 100).toFixed(1)}%`, color: "text-[#4A90A4]" },
            { label: "二级节点", value: `${(displayAgreement.level2Rate * 100).toFixed(1)}%`, color: "text-[#4A90A4]" },
            { label: "Cohen&apos;s Kappa", value: displayAgreement.kappa.toFixed(3), color: "text-[#4A90A4]" },
          ].map((s) => (
            <Card key={s.label} className="border-[#E2E5E9]">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-[#7F8A93]">{s.label}</p>
                <p className={`text-lg font-mono font-semibold ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Two-column comparison */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-[#E2E5E9]">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-[#2D3436] mb-3">编码员 A ({annotationsA.length} 条标注)</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {annotationsA.map((a) => {
                const isMatch = annotationsB.some((b) => b.node_id === a.node_id);
                const node = nodes.find((n) => n.id === a.node_id);
                return (
                  <div
                    key={a.id}
                    className={`p-2 rounded text-xs border ${
                      isMatch ? "border-[#5DAD93]/30 bg-[#5DAD93]/5" : "border-[#E67E22]/30 bg-[#E67E22]/3"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="block w-2 h-2 rounded-full" style={{ backgroundColor: node?.color ?? "#4A90A4" }} />
                      <span className="font-medium">{node?.label ?? "?"}</span>
                      {isMatch ? (
                        <CheckCircle2 className="h-3 w-3 text-[#5DAD93] ml-auto" />
                      ) : (
                        <XCircle className="h-3 w-3 text-[#E67E22] ml-auto" />
                      )}
                    </div>
                    {a.quote_text && (
                      <p className="text-[#4A5568] italic pl-3.5">&ldquo;{a.quote_text.slice(0, 150)}&rdquo;</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E2E5E9]">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-[#2D3436] mb-3">编码员 B ({annotationsB.length} 条标注)</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {annotationsB.map((a) => {
                const isMatch = annotationsA.some((b) => b.node_id === a.node_id);
                const node = nodes.find((n) => n.id === a.node_id);
                return (
                  <div
                    key={a.id}
                    className={`p-2 rounded text-xs border ${
                      isMatch ? "border-[#5DAD93]/30 bg-[#5DAD93]/5" : "border-[#E67E22]/30 bg-[#E67E22]/3"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="block w-2 h-2 rounded-full" style={{ backgroundColor: node?.color ?? "#4A90A4" }} />
                      <span className="font-medium">{node?.label ?? "?"}</span>
                      {isMatch ? (
                        <CheckCircle2 className="h-3 w-3 text-[#5DAD93] ml-auto" />
                      ) : (
                        <XCircle className="h-3 w-3 text-[#E67E22] ml-auto" />
                      )}
                    </div>
                    {a.quote_text && (
                      <p className="text-[#4A5568] italic pl-3.5">&ldquo;{a.quote_text.slice(0, 150)}&rdquo;</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Arbitration Section */}
      {canReview && task.status === "completed" && agreementFromTask && (
        <ArbitrationView
          roundId={taskId}
          annotationsA={annotationsA}
          annotationsB={annotationsB}
          nodes={nodes}
          agreement={{
            agreementRate: task.agreement_rate ?? 0,
            level1Rate: 0,
            level2Rate: 0,
            kappa: task.kappa ?? 0,
            matchedCount: 0,
            totalPairs: 0,
            coderAOnly: 0,
            coderBOnly: 0,
          }}
          onArbitrate={handleArbitrate}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Review completed notice */}
      {task.status === "reviewed" && (
        <Card className="border-[#5DAD93]/30 bg-[#5DAD93]/5">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-[#5DAD93] mx-auto mb-1" />
            <p className="text-sm text-[#2D3436]">仲裁已完成，标注结果已锁定</p>
            {task.reviewer_note && (
              <p className="text-xs text-[#7F8A93] mt-1">
                裁定理由：{task.reviewer_note}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
