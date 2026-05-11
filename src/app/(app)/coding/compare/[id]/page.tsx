"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDualCodingStore } from "@/stores/dual-coding-store";
import { useCodingStore } from "@/stores/coding-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArbitrationView } from "@/components/coding/arbitration-view";
import { selectCanManageAssignments } from "@/stores/auth-store";
import { useAuthStore } from "@/stores/auth-store";
import { ArrowLeft, CheckCircle2, XCircle, Calculator } from "lucide-react";

export default function ComparePage() {
  const params = useParams();
  const router = useRouter();
  const roundId = params.id as string;
  const canManage = useAuthStore(selectCanManageAssignments);

  const {
    selectedRound,
    annotationsA,
    annotationsB,
    isLoading,
    loadRoundDetail,
    calculateAgreement,
    arbitrate,
  } = useDualCodingStore();

  const { nodes, loadFrameworkNodes, frameworks, loadFrameworks } = useCodingStore();
  const [isCalcLoading, setIsCalcLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const agreement = useDualCodingStore((s) => s.agreement);

  useEffect(() => {
    loadRoundDetail(roundId);
    loadFrameworks();
  }, [roundId, loadRoundDetail, loadFrameworks]);

  useEffect(() => {
    if (frameworks.length > 0) {
      loadFrameworkNodes(frameworks[0].id);
    }
  }, [frameworks, loadFrameworkNodes]);

  async function handleCalculate() {
    setIsCalcLoading(true);
    await calculateAgreement(roundId);
    setIsCalcLoading(false);
  }

  async function handleArbitrate(id: string, resolvedIds: string[], note: string) {
    setIsSubmitting(true);
    const ok = await arbitrate(id, resolvedIds, note);
    setIsSubmitting(false);
    if (ok) loadRoundDetail(roundId);
  }

  const matchCount = annotationsA.filter((a) =>
    annotationsB.some((b) => b.node_id === a.node_id),
  ).length;

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-7xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push("/coding")}
            variant="ghost"
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold text-[#2D3436]">
              并排对比 · 双编码仲裁
            </h1>
            {selectedRound && (
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className="text-[10px] bg-[#4A90A4]/10 text-[#4A90A4]">
                  {selectedRound.status === "in_progress" ? "进行中" :
                   selectedRound.status === "both_done" ? "双方完成" :
                   selectedRound.status === "disputed" ? "待仲裁" : "已裁定"}
                </Badge>
                {selectedRound.agreement_rate != null && (
                  <span className="text-xs text-[#7F8A93]">
                    一致率 {(selectedRound.agreement_rate * 100).toFixed(1)}%
                  </span>
                )}
                {selectedRound.kappa != null && (
                  <span className="text-xs text-[#7F8A93]">
                    κ={selectedRound.kappa.toFixed(3)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {canManage && (
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

      {/* Agreement Stats */}
      {agreement && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "整体一致率", value: `${(agreement.agreementRate * 100).toFixed(1)}%`, color: agreement.agreementRate >= 0.8 ? "text-[#5DAD93]" : "text-[#E67E22]" },
            { label: "一级节点", value: `${(agreement.level1Rate * 100).toFixed(1)}%`, color: "text-[#4A90A4]" },
            { label: "二级节点", value: `${(agreement.level2Rate * 100).toFixed(1)}%`, color: "text-[#4A90A4]" },
            { label: "Cohen's Kappa", value: agreement.kappa.toFixed(3), color: "text-[#4A90A4]" },
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

      {/* Three-column comparison */}
      <div className="grid grid-cols-2 gap-4">
        {/* Coder A column */}
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

        {/* Coder B column */}
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

      {/* Arbitration Section (only for admin and disputed status) */}
      {canManage && selectedRound?.status === "disputed" && agreement && (
        <ArbitrationView
          roundId={roundId}
          article={null}
          annotationsA={annotationsA}
          annotationsB={annotationsB}
          nodes={nodes}
          agreement={agreement}
          onArbitrate={handleArbitrate}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Arbitration completed notice */}
      {selectedRound?.status === "arbitrated" && (
        <Card className="border-[#5DAD93]/30 bg-[#5DAD93]/5">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-[#5DAD93] mx-auto mb-1" />
            <p className="text-sm text-[#2D3436]">仲裁已完成，标注结果已锁定</p>
            {selectedRound.arbiter_note && (
              <p className="text-xs text-[#7F8A93] mt-1">
                裁定理由：{selectedRound.arbiter_note}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
