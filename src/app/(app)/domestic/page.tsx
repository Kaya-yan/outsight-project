"use client";

import { useEffect, useState } from "react";
import { useDomesticStore } from "@/stores/domestic-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { CollectionPanel } from "@/components/domestic/collection-panel";
import { ManualUpload } from "@/components/domestic/manual-upload";
import { ArticleDetail } from "@/components/domestic/article-detail";
import { AnalysisDashboard } from "@/components/domestic/analysis-dashboard";
import { MEDIA_ADAPTERS } from "@/lib/domestic/media-adapters";
import { Newspaper, BarChart3, Upload, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type Tab = "articles" | "dashboard" | "upload";

export default function DomesticPage() {
  const {
    articles, total, page, pageSize, isLoading, error,
    filters, setFilter, resetFilters, setPage,
    fetchArticles, activeArticle, fetchArticle,
  } = useDomesticStore();

  const [tab, setTab] = useState<Tab>("articles");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-[#4A90A4]" />
          <h1 className="text-xl font-semibold text-[#2D3436]">国媒语料库</h1>
          <span className="text-sm text-[#7F8A93]">国内主流媒体话语分析</span>
        </div>
        <div className="flex gap-1">
          {([
            { key: "articles" as Tab, label: "文章列表", icon: Newspaper },
            { key: "upload" as Tab, label: "手动补充", icon: Upload },
            { key: "dashboard" as Tab, label: "数据概览", icon: BarChart3 },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                tab === key ? "bg-[#4A90A4]/10 text-[#4A90A4]" : "text-[#7F8A93] hover:text-[#2D3436]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Article Detail View */}
      {activeArticle ? (
        <ArticleDetail />
      ) : (
        <>
          {/* Collection Panel (always visible) */}
          <CollectionPanel />

          {tab === "articles" && (
            <>
              {/* Search & Filters */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#95A5A6]" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setFilter("search", searchInput || undefined);
                    }}
                    placeholder="搜索标题或正文..."
                    className="h-9 pl-8 text-sm border-[#E2E5E9] bg-white"
                  />
                </div>
                <select
                  value={filters.media ?? ""}
                  onChange={(e) => setFilter("media", e.target.value || undefined)}
                  className="h-9 rounded-md border border-[#E2E5E9] bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4]"
                >
                  <option value="">全部媒体</option>
                  {MEDIA_ADAPTERS.map((a) => (
                    <option key={a.id} value={a.name}>{a.name}</option>
                  ))}
                </select>
                <Input
                  type="date"
                  value={filters.dateFrom ?? ""}
                  onChange={(e) => setFilter("dateFrom", e.target.value || undefined)}
                  className="h-9 text-sm border-[#E2E5E9] bg-white w-36"
                />
                <Input
                  type="date"
                  value={filters.dateTo ?? ""}
                  onChange={(e) => setFilter("dateTo", e.target.value || undefined)}
                  className="h-9 text-sm border-[#E2E5E9] bg-white w-36"
                />
                {(filters.search || filters.media || filters.dateFrom || filters.dateTo) && (
                  <Button variant="ghost" onClick={() => { resetFilters(); setSearchInput(""); }} className="h-9 text-sm text-[#7F8A93]">
                    清除
                  </Button>
                )}
              </div>

              {/* Article List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-[#4A90A4]" />
                </div>
              ) : error ? (
                <Card className="border-[#E67E22]/30">
                  <CardContent className="p-4 text-sm text-[#E67E22]">{error}</CardContent>
                </Card>
              ) : articles.length === 0 ? (
                <EmptyState
                  icon={Newspaper}
                  title="暂无文章"
                  description="使用上方采集面板开始采集国内媒体文章"
                />
              ) : (
                <div className="space-y-2">
                  {articles.map((article) => {
                    const aiMeta = (article.metadata as Record<string, unknown>)?.domestic_ai_analysis as Record<string, unknown> | undefined;
                    const hasAi = !!aiMeta;
                    const sentiment = (aiMeta?.sentiment as Record<string, string>)?.polarity;

                    return (
                      <Card
                        key={article.id}
                        className="border-[#E2E5E9] hover:border-[#4A90A4]/40 transition-colors cursor-pointer"
                        onClick={() => fetchArticle(article.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-[#2D3436] leading-snug truncate">
                                {article.title}
                              </h3>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-[#7F8A93]">
                                <span>{article.media}</span>
                                <span>{article.publish_date}</span>
                                <span>{article.word_count} 字</span>
                                {article.author ? <span>{article.author}</span> : null}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {hasAi && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  sentiment === "positive" ? "bg-emerald-500/10 text-emerald-600" :
                                  sentiment === "negative" ? "bg-red-500/10 text-red-600" :
                                  "bg-[#7F8A93]/10 text-[#7F8A93]"
                                }`}>
                                  {sentiment === "positive" ? "正面" : sentiment === "negative" ? "负面" : "中性"}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-[#7F8A93]">
                        共 {total} 篇 · 第 {page}/{totalPages} 页
                      </span>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1} className="h-8 text-xs">
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="h-8 text-xs">
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {tab === "upload" && <ManualUpload />}
          {tab === "dashboard" && <AnalysisDashboard />}
        </>
      )}
    </div>
  );
}
