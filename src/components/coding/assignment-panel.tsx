"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDualCodingStore } from "@/stores/dual-coding-store";
import { Users, Plus, ChevronRight } from "lucide-react";

const STATUS_BADGES: Record<string, string> = {
  in_progress: "bg-[#4A90A4]/10 text-[#4A90A4]",
  both_done: "bg-[#5DAD93]/10 text-[#5DAD93]",
  disputed: "bg-[#E67E22]/10 text-[#E67E22]",
  arbitrated: "bg-[#2D3436]/10 text-[#2D3436]",
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: "进行中",
  both_done: "双方完成",
  disputed: "待仲裁",
  arbitrated: "已裁定",
};

interface AssignmentPanelProps {
  onViewRound: (id: string) => void;
}

export function AssignmentPanel({ onViewRound }: AssignmentPanelProps) {
  const { rounds, isLoading, loadRounds } = useDualCodingStore();
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadRounds(statusFilter || undefined);
  }, [loadRounds, statusFilter]);

  return (
    <Card className="border-[#E2E5E9] shadow-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#4A90A4]" />
            <h3 className="text-sm font-medium text-[#2D3436]">双编码任务</h3>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-7 rounded border border-[#E2E5E9] bg-white px-2 text-xs"
          >
            <option value="">全部状态</option>
            <option value="in_progress">进行中</option>
            <option value="both_done">双方完成</option>
            <option value="disputed">待仲裁</option>
            <option value="arbitrated">已裁定</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-xs text-[#7F8A93] py-4 text-center">加载中...</p>
        ) : rounds.length === 0 ? (
          <p className="text-xs text-[#7F8A93] py-4 text-center">
            暂无双编码任务，请在语料工作台中选择文章分配双人编码
          </p>
        ) : (
          <div className="space-y-2">
            {rounds.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-2 rounded hover:bg-[#F0F2F5] cursor-pointer text-xs"
                onClick={() => onViewRound(r.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className={`text-[10px] ${STATUS_BADGES[r.status] ?? ""}`}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </Badge>
                  {r.agreement_rate != null && (
                    <span className="font-mono text-[#2D3436]">
                      {(r.agreement_rate * 100).toFixed(1)}%
                    </span>
                  )}
                  {r.kappa != null && (
                    <span className="text-[#7F8A93]">
                      κ={r.kappa.toFixed(3)}
                    </span>
                  )}
                </div>
                <ChevronRight className="h-3 w-3 text-[#95A5A6] shrink-0" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
