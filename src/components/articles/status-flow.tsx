"use client";

import { cn } from "@/lib/utils";
import { ARTICLE_STATUS_TRANSITIONS, type ArticleStatus } from "@/types/database";
import { ChevronRight } from "lucide-react";

const ALL_STATUSES: ArticleStatus[] = [
  "待发现",
  "已入库",
  "已下载全文",
  "已清洗",
  "已预读",
  "待编码",
  "编码完成",
  "已封存",
];

interface StatusFlowProps {
  currentStatus: ArticleStatus;
  onTransition?: (newStatus: ArticleStatus) => void;
}

export function StatusFlow({ currentStatus, onTransition }: StatusFlowProps) {
  const currentIdx = ALL_STATUSES.indexOf(currentStatus);
  const allowedNext = ARTICLE_STATUS_TRANSITIONS[currentStatus] ?? [];

  return (
    <div className="flex flex-wrap items-center gap-1 text-[11px]">
      {ALL_STATUSES.map((status, i) => {
        const isCurrent = status === currentStatus;
        const isPast = i < currentIdx;
        const isReachable = allowedNext.includes(status);
        const isClickable = isReachable && onTransition;

        return (
          <span key={status} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3 w-3 text-[#D1D5DB] shrink-0" />
            )}
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onTransition?.(status)}
              className={cn(
                "rounded px-1.5 py-0.5 whitespace-nowrap transition-colors",
                isCurrent && "bg-[#4A90A4] text-white font-medium",
                isPast && !isCurrent && "text-[#7F8A93]",
                !isPast && !isCurrent && !isReachable && "text-[#D1D5DB]",
                isReachable && !isCurrent && "text-[#5DAD93] hover:bg-[#5DAD93]/10 cursor-pointer",
                !isReachable && !isCurrent && "cursor-default",
              )}
            >
              {status}
            </button>
          </span>
        );
      })}
    </div>
  );
}
