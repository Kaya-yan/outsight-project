"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Code2, ChevronRight, Users, Inbox } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: { label: "待开始", className: "bg-[#7F8A93]/10 text-[#7F8A93]" },
  in_progress: { label: "进行中", className: "bg-[#4A90A4]/10 text-[#4A90A4]" },
  completed: { label: "已完成", className: "bg-[#5DAD93]/10 text-[#5DAD93]" },
  reviewed: { label: "已终审", className: "bg-[#2D3436]/10 text-[#2D3436]" },
};

interface TaskRow {
  id: string;
  article_id: string;
  task_type: string;
  status: string;
  coder_a_done: boolean;
  coder_b_done: boolean;
  coder_a_id: string | null;
  agreement_rate: number | null;
  articles?: {
    title: string;
    media: string;
    period: string | null;
    status: string;
    word_count: number | null;
  } | null;
}

interface MyTasksListProps {
  tasks: TaskRow[];
  isLoading: boolean;
  currentUserId: string;
  mode?: "my" | "pool";
  onClaim?: (taskId: string) => Promise<void>;
}

export function MyTasksList({ tasks, isLoading, currentUserId, mode = "my", onClaim }: MyTasksListProps) {
  const router = useRouter();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  if (isLoading) {
    return <p className="p-6 text-center text-sm text-[#7F8A93]">加载中...</p>;
  }

  if (tasks.length === 0) {
    return (
      <div className="p-12">
        <EmptyState
          icon={mode === "pool" ? Inbox : Code2}
          title={mode === "pool" ? "任务池为空" : "暂无编码任务"}
          description={mode === "pool"
            ? "管理员创建任务时不留编码员，任务就会进入池子供全员认领。"
            : "当管理员为你分配编码任务后，任务会显示在这里。"}
        />
      </div>
    );
  }

  async function handleClaim(taskId: string) {
    setClaimingId(taskId);
    if (onClaim) await onClaim(taskId);
    setClaimingId(null);
  }

  return (
    <div className="space-y-2">
      {tasks.map((t) => {
        const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.open;
        const isSolo = t.task_type === "solo";
        const isPool = mode === "pool" && t.coder_a_id === null;
        const myDone = t.coder_a_done;
        const otherDone = t.coder_b_done;

        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 p-3 rounded border border-[#F0F2F5] transition-colors ${
              isPool ? "" : "hover:bg-[#F0F2F5]/50 cursor-pointer"
            }`}
            onClick={() => { if (!isPool) router.push(`/coding/${t.article_id}?task_id=${t.id}`); }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#2D3436] truncate">
                {t.articles?.title ?? "未知文章"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {t.articles?.media && (
                  <span className="text-xs text-[#7F8A93]">{t.articles.media}</span>
                )}
                {t.articles?.period && (
                  <span className="text-xs text-[#7F8A93]">{t.articles.period}</span>
                )}
                <span className="text-xs text-[#7F8A93]">
                  <Users className="h-3 w-3 inline mr-0.5" />
                  {isSolo ? "单人编码" : "双人编码"}
                </span>
              </div>
              {!isSolo && t.status === "in_progress" && (
                <div className="flex items-center gap-1 mt-1.5">
                  <span className={`h-2 w-2 rounded-full ${myDone ? "bg-[#5DAD93]" : "bg-[#E2E5E9]"}`} />
                  <span className="text-[10px] text-[#95A5A6]">我</span>
                  <span className={`h-2 w-2 rounded-full ml-1 ${otherDone ? "bg-[#5DAD93]" : "bg-[#E2E5E9]"}`} />
                  <span className="text-[10px] text-[#95A5A6]">对方</span>
                </div>
              )}
            </div>

            <Badge className={`text-[10px] shrink-0 ${cfg.className}`}>
              {isPool ? "待认领" : cfg.label}
            </Badge>

            {t.agreement_rate != null && (
              <span className="text-xs text-[#7F8A93] shrink-0 font-mono">
                {(t.agreement_rate * 100).toFixed(0)}%
              </span>
            )}

            {isPool ? (
              <Button
                onClick={(e) => { e.stopPropagation(); handleClaim(t.id); }}
                disabled={claimingId === t.id}
                className="h-7 text-xs bg-[#4A90A4] hover:bg-[#3D7D8F] text-white shrink-0"
              >
                {claimingId === t.id ? "认领中..." : "认领"}
              </Button>
            ) : (
              <ChevronRight className="h-4 w-4 text-[#95A5A6] shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Used by the task management panel
export { type TaskRow };
