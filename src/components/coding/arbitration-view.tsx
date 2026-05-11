"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Annotation, CodingNode, Article } from "@/types/database";
import type { AgreementResult } from "@/lib/stats/agreement";
import { CheckCircle2, XCircle, Gavel } from "lucide-react";

interface ArbitrationViewProps {
  roundId: string;
  article: Article | null;
  annotationsA: Annotation[];
  annotationsB: Annotation[];
  nodes: CodingNode[];
  agreement: AgreementResult | null;
  onArbitrate: (id: string, resolvedIds: string[], note: string) => Promise<boolean>;
  isSubmitting: boolean;
}

type Resolution = "coder_a" | "coder_b" | "unresolved";

export function ArbitrationView({
  roundId,
  annotationsA,
  annotationsB,
  nodes,
  agreement,
  onArbitrate,
  isSubmitting,
}: ArbitrationViewProps) {
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({});
  const [note, setNote] = useState("");

  // Build comparison pairs: find common nodes and unique nodes
  const nodeMap = new Map<string, CodingNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const nodesA = new Map(annotationsA.map((a) => [a.node_id, a]));
  const nodesB = new Map(annotationsB.map((a) => [a.node_id, a]));
  const allNodeIds = new Set([...nodesA.keys(), ...nodesB.keys()]);

  async function handleSubmit() {
    const resolvedIds = annotationsA
      .filter((a) => resolutions[a.id] === "coder_a")
      .map((a) => a.id)
      .concat(
        annotationsB
          .filter((a) => resolutions[a.id] === "coder_b")
          .map((a) => a.id),
      );
    await onArbitrate(roundId, resolvedIds, note);
  }

  const resolvedCount = Object.keys(resolutions).filter((k) => resolutions[k] !== "unresolved").length;

  return (
    <div className="space-y-4">
      {/* Agreement Summary */}
      {agreement && (
        <Card className={`border-2 ${agreement.agreementRate < 0.8 ? "border-[#E67E22]/30" : "border-[#5DAD93]/30"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gavel className="h-4 w-4 text-[#E67E22]" />
              <h3 className="text-sm font-semibold text-[#2D3436]">仲裁裁定</h3>
              {agreement.agreementRate < 0.8 && (
                <Badge className="text-[10px] bg-[#E67E22]/10 text-[#E67E22]">需仲裁</Badge>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[#7F8A93]">整体一致率</span>
                <p className="font-mono font-medium text-[#2D3436]">
                  {(agreement.agreementRate * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <span className="text-[#7F8A93]">一级节点</span>
                <p className="font-mono font-medium text-[#2D3436]">
                  {(agreement.level1Rate * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <span className="text-[#7F8A93]">Cohen's Kappa</span>
                <p className="font-mono font-medium text-[#2D3436]">
                  {agreement.kappa.toFixed(3)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-node comparison */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {[...allNodeIds].map((nodeId) => {
          const annotA = nodesA.get(nodeId);
          const annotB = nodesB.get(nodeId);
          const node = nodeMap.get(nodeId);
          const isMatch = annotA && annotB;
          const label = node?.label ?? nodeId.slice(0, 8);

          return (
            <Card
              key={nodeId}
              className={`border text-xs ${
                isMatch
                  ? "border-[#5DAD93]/30 bg-[#5DAD93]/5"
                  : "border-[#E67E22]/30 bg-[#E67E22]/3"
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: node?.color ?? "#4A90A4" }}
                  />
                  <span className="font-medium text-[#2D3436]">{label}</span>
                  <span className="text-[#95A5A6]">{node?.code}</span>
                  {isMatch ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#5DAD93] ml-auto" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-[#E67E22] ml-auto" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  {/* Coder A side */}
                  <div className={`p-1.5 rounded ${isMatch ? "bg-[#5DAD93]/10" : ""}`}>
                    <span className="text-[10px] text-[#7F8A93]">编码员 A</span>
                    {annotA ? (
                      <p className="text-[#2D3436] mt-0.5">{annotA.quote_text ?? "(无引文)"}</p>
                    ) : (
                      <p className="text-[#95A5A6] italic mt-0.5">无标注</p>
                    )}
                  </div>
                  {/* Coder B side */}
                  <div className={`p-1.5 rounded ${isMatch ? "bg-[#5DAD93]/10" : ""}`}>
                    <span className="text-[10px] text-[#7F8A93]">编码员 B</span>
                    {annotB ? (
                      <p className="text-[#2D3436] mt-0.5">{annotB.quote_text ?? "(无引文)"}</p>
                    ) : (
                      <p className="text-[#95A5A6] italic mt-0.5">无标注</p>
                    )}
                  </div>
                </div>

                {/* Resolution selector for mismatched */}
                {!isMatch && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#E2E5E9]">
                    <span className="text-[10px] text-[#7F8A93]">裁定：</span>
                    {(["coder_a", "coder_b"] as Resolution[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() =>
                          setResolutions((prev) => ({
                            ...prev,
                            [annotA?.id ?? annotB?.id ?? nodeId]: r,
                          }))
                        }
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          resolutions[annotA?.id ?? annotB?.id ?? nodeId] === r
                            ? r === "coder_a" ? "bg-[#4A90A4] text-white" : "bg-[#5DAD93] text-white"
                            : "bg-[#F0F2F5] text-[#7F8A93]"
                        }`}
                      >
                        {r === "coder_a" ? "采纳 A" : "采纳 B"}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit */}
      <Card className="border-[#E2E5E9]">
        <CardContent className="p-4">
          <label className="text-xs text-[#7F8A93] mb-1 block">裁定理由（必填）</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="请填写仲裁依据，如「依据原文第三段，B的判定更贴近文本」"
            className="w-full rounded border border-[#E2E5E9] px-3 py-2 text-xs resize-none mb-3"
          />
          <Button
            onClick={handleSubmit}
            disabled={!note.trim() || isSubmitting || resolvedCount === 0}
            className="h-8 text-xs w-full bg-[#E67E22] hover:bg-[#D46E1A] text-white"
          >
            {isSubmitting ? "裁定中..." : `确认裁定（已解决 ${resolvedCount} 项）`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
