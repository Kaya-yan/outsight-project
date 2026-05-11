"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "./status-badge";
import type { Article, ArticleStatus } from "@/types/database";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArticleTableProps {
  articles: Article[];
  isLoading: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onEdit: (article: Article) => void;
  onDelete: (article: Article) => void;
  onStatusChange: (article: Article, newStatus: ArticleStatus) => void;
}

export function ArticleTable({
  articles,
  isLoading,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onStatusChange,
}: ArticleTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[#7F8A93]">
        暂无符合条件的语料
      </p>
    );
  }

  const allSelected = articles.length > 0 && selectedIds.length === articles.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#E2E5E9] text-left">
            <th className="p-3 w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => onSelectAll()}
              />
            </th>
            <th className="p-3 text-[#7F8A93] font-medium">标题</th>
            <th className="p-3 text-[#7F8A93] font-medium w-24">媒体</th>
            <th className="p-3 text-[#7F8A93] font-medium w-28">时段</th>
            <th className="p-3 text-[#7F8A93] font-medium w-20">状态</th>
            <th className="p-3 text-[#7F8A93] font-medium w-20">字数</th>
            <th className="p-3 text-[#7F8A93] font-medium w-20">操作</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((article) => {
            const isSelected = selectedIds.includes(article.id);
            return (
              <tr
                key={article.id}
                className={cn(
                  "border-b border-[#F0F2F5] hover:bg-[#F0F2F5]/50 transition-colors",
                  isSelected && "bg-[#4A90A4]/5",
                )}
              >
                <td className="p-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(article.id)}
                  />
                </td>
                <td className="p-3">
                  <p className="font-medium text-[#2D3436] line-clamp-1">
                    {article.title}
                  </p>
                  {article.publish_date && (
                    <p className="text-xs text-[#7F8A93] mt-0.5">
                      {article.publish_date}
                    </p>
                  )}
                </td>
                <td className="p-3 text-[#7F8A93]">{article.media}</td>
                <td className="p-3 text-[#7F8A93] text-xs">{article.period ?? "-"}</td>
                <td className="p-3">
                  <StatusBadge status={article.status} size="sm" />
                </td>
                <td className="p-3 text-[#7F8A93] font-mono text-xs">
                  {article.word_count ?? "-"}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(article)}
                      className="p-1 rounded hover:bg-[#E2E5E9] text-[#7F8A93] hover:text-[#4A90A4]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(article)}
                      className="p-1 rounded hover:bg-[#E2E5E9] text-[#7F8A93] hover:text-[#E67E22]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Simple checkbox component since the project may not have one from shadcn
function Checkbox({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onCheckedChange}
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded border transition-colors",
        checked
          ? "border-[#4A90A4] bg-[#4A90A4] text-white"
          : "border-[#D1D5DB] bg-white hover:border-[#4A90A4]",
      )}
    >
      {checked && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M1.5 5L4 7.5L8.5 2.5" />
        </svg>
      )}
    </button>
  );
}
