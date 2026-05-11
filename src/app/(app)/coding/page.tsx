"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/articles/status-badge";
import { AssignmentPanel } from "@/components/coding/assignment-panel";
import { useAuthStore, selectCanManageAssignments } from "@/stores/auth-store";
import { MEDIA_OUTLETS, RESEARCH_PERIODS } from "@/lib/constants";
import { Code2, Search, ArrowRight, Users } from "lucide-react";

interface ArticleRow {
  id: string;
  title: string;
  media: string;
  period: string | null;
  status: string;
  word_count: number | null;
  publish_date: string | null;
}

export default function CodingPage() {
  const router = useRouter();
  const canManage = useAuthStore(selectCanManageAssignments);
  const [tab, setTab] = useState<"solo" | "dual">("solo");
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mediaFilter, setMediaFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", "待编码");
      params.set("pageSize", "50");
      if (search) params.set("search", search);
      if (mediaFilter) params.set("media", mediaFilter);
      if (periodFilter) params.set("period", periodFilter);
      const res = await fetch(`/api/articles?${params}`);
      if (res.ok) {
        const json = await res.json();
        setArticles(json.data ?? []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, mediaFilter, periodFilter]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#2D3436]">编码实验室</h1>
          <p className="mt-0.5 text-sm text-[#7F8A93]">
            {tab === "solo" ? "选择语料开始编码标注" : "双人编码任务管理"}
          </p>
        </div>
        {canManage && (
          <div className="flex rounded-md overflow-hidden border border-[#E2E5E9]">
            <button
              type="button"
              onClick={() => setTab("solo")}
              className={`px-3 py-1.5 text-xs ${tab === "solo" ? "bg-[#4A90A4] text-white" : "bg-white text-[#7F8A93] hover:bg-[#F0F2F5]"}`}
            >
              <Code2 className="h-3.5 w-3.5 inline mr-1" />
              单人编码
            </button>
            <button
              type="button"
              onClick={() => setTab("dual")}
              className={`px-3 py-1.5 text-xs ${tab === "dual" ? "bg-[#4A90A4] text-white" : "bg-white text-[#7F8A93] hover:bg-[#F0F2F5]"}`}
            >
              <Users className="h-3.5 w-3.5 inline mr-1" />
              双编码任务
            </button>
          </div>
        )}
      </div>

      {tab === "dual" && canManage ? (
        /* Dual Coding Tab */
        <AssignmentPanel onViewRound={(id) => router.push(`/coding/compare/${id}`)} />
      ) : (
        <>
          {/* Solo Coding - Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#95A5A6]" />
              <Input
                placeholder="搜索语料..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs border-[#E2E5E9]"
              />
            </div>
            <select
              value={mediaFilter}
              onChange={(e) => setMediaFilter(e.target.value)}
              className="h-8 rounded border border-[#E2E5E9] bg-white px-2 text-xs"
            >
              <option value="">全部媒体</option>
              {MEDIA_OUTLETS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="h-8 rounded border border-[#E2E5E9] bg-white px-2 text-xs"
            >
              <option value="">全部时段</option>
              {RESEARCH_PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Solo Coding - Article list */}
          <Card className="border-[#E2E5E9] shadow-card">
            <CardContent className="p-0">
              {isLoading ? (
                <p className="p-6 text-center text-sm text-[#7F8A93]">加载中...</p>
              ) : articles.length === 0 ? (
                <div className="p-12">
                  <EmptyState
                    icon={Code2}
                    title="暂无可编码语料"
                    description="语料需先完成清洗和预读后，状态变为「待编码」才会出现在此列表。"
                  />
                </div>
              ) : (
                <div className="divide-y divide-[#F0F2F5]">
                  {articles.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-4 p-3 hover:bg-[#F0F2F5]/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/coding/${a.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#2D3436] truncate">{a.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[#7F8A93]">{a.media}</span>
                          {a.period && <span className="text-xs text-[#7F8A93]">{a.period}</span>}
                          {a.word_count && (
                            <span className="text-xs text-[#95A5A6]">{a.word_count} 词</span>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={a.status} size="sm" />
                      <ArrowRight className="h-4 w-4 text-[#95A5A6] shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
