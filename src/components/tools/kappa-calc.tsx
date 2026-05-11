"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

function interpretKappa(k: number): string {
  if (k < 0) return "极差（低于随机水平）";
  if (k < 0.2) return "轻微一致";
  if (k < 0.4) return "一般一致";
  if (k < 0.6) return "中等一致";
  if (k < 0.8) return "良好一致";
  return "优秀一致";
}

// Simplified standalone Cohen's Kappa
function calcKappa(
  pairs: Array<{ nodeA: string; nodeB: string }>,
): { kappa: number; agreement: number; total: number; interpretation: string } {
  const allNodes = new Set<string>();
  for (const p of pairs) {
    allNodes.add(p.nodeA);
    allNodes.add(p.nodeB);
  }

  const nodeList = [...allNodes];
  const n = pairs.length;
  if (n === 0) return { kappa: 0, agreement: 0, total: 0, interpretation: "无数据" };

  // Observed agreement
  let agree = 0;
  for (const p of pairs) {
    if (p.nodeA === p.nodeB) agree++;
  }
  const po = agree / n;

  // Expected agreement
  const countA = new Map<string, number>();
  const countB = new Map<string, number>();
  for (const p of pairs) {
    countA.set(p.nodeA, (countA.get(p.nodeA) ?? 0) + 1);
    countB.set(p.nodeB, (countB.get(p.nodeB) ?? 0) + 1);
  }

  let pe = 0;
  for (const node of nodeList) {
    const pA = (countA.get(node) ?? 0) / n;
    const pB = (countB.get(node) ?? 0) / n;
    pe += pA * pB;
  }

  const kappa = Math.abs(1 - pe) < 0.0001 ? 1 : (po - pe) / (1 - pe);

  return {
    kappa: Math.round(kappa * 1000) / 1000,
    agreement: Math.round(po * 100),
    total: n,
    interpretation: interpretKappa(kappa),
  };
}

export function KappaCalc() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ReturnType<typeof calcKappa> | null>(null);
  const [error, setError] = useState("");

  function calculate() {
    setError("");
    const lines = input.trim().split("\n").filter(Boolean);
    const pairs: Array<{ nodeA: string; nodeB: string }> = [];

    for (const line of lines) {
      const parts = line.split(/[,\t]/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        pairs.push({ nodeA: parts[0], nodeB: parts[1] });
      }
    }

    if (pairs.length === 0) {
      setError("请粘贴至少两列数据（每行：编码员A的标签, 编码员B的标签）");
      return;
    }

    setResult(calcKappa(pairs));
  }

  return (
    <div className="space-y-3">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={8}
        className="w-full rounded border border-[#E2E5E9] px-3 py-2 text-xs resize-none font-mono"
        placeholder="粘贴两列编码结果，每行一组，逗号或制表符分隔：&#10;Threat,Opportunity&#10;Neutral,Neutral&#10;Problem,Problem"
      />
      <Button onClick={calculate} disabled={!input} className="h-8 text-xs gap-1 bg-[#4A90A4] text-white">
        <Calculator className="h-3.5 w-3.5" /> 计算
      </Button>
      {error && <p className="text-xs text-[#E67E22]">{error}</p>}
      {result && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-[#FAFBFC] rounded p-2 text-center">
            <p className="text-[#7F8A93]">观察一致率</p>
            <p className="font-mono font-medium text-[#2D3436]">{result.agreement}%</p>
          </div>
          <div className="bg-[#FAFBFC] rounded p-2 text-center">
            <p className="text-[#7F8A93]">Cohen's Kappa</p>
            <p className="font-mono font-medium text-[#4A90A4]">{result.kappa}</p>
          </div>
          <div className="bg-[#FAFBFC] rounded p-2 text-center">
            <p className="text-[#7F8A93]">评价</p>
            <p className="font-mono font-medium text-[#5DAD93]">{result.interpretation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
