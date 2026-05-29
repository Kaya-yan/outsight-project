"use client";

import { useEffect, useState } from "react";
import { useDomesticStore } from "@/stores/domestic-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { CollectionPanel } from "@/components/domestic/collection-panel";
import { ArticleDetail } from "@/components/domestic/article-detail";
import { AnalysisDashboard } from "@/components/domestic/analysis-dashboard";
import { Newspaper, BarChart3, Search, ChevronLeft, ChevronRight, Loader2, Brain } from "lucide-react";

type Tab = "articles" | "dashboard";

export default function DomesticPage() {
  const {
    articles, total, page, pageSize, isLoading, error,
    filters, setFilter, resetFilters, setPage,
    fetchArticles, activeArticle, fetchArticle, triggerAnalysis,
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
          <h1 className="text-lg font-semibold text-gray-100">国媒语料库</h1>
          <span className="text-xs text-gray-500">国内主流媒体话语分析</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setTab("articles")}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              tab === "articles" ? "bg-[#4A90A4]/20 text-[#4A90A4]" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Newspaper className="h-3.5 w-3.5 inline mr-1" />
            文章列表
          </button>
          <button
            onClick={() => setTab("dashboard")}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              tab === "dashboard" ? "bg-[#4A90A4]/20 text-[#4A90A4]" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 inline mr-1" />
            数据概览
          </button>
        </div>
      </div>

      {/* Active Article Detail View */}
      {activeArticle ? (
        <ArticleDetail />
      ) : (
        <>
          {/* Collection Panel */}
          <CollectionPanel />

          {tab === "articles" && (
            <>
              {/* Search & Filters */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setFilter("search", searchInput || undefined);
                      }
                    }}
                    placeholder="搜索标题或正文..."
                    className="pl-8 bg-[#2D3436] border-[#3D4446] text-gray-200 text-xs h-8"
                  />
                </div>
                <select
                  value={filters.media ?? ""}
                  onChange={(e) => setFilter("media", e.target.value || undefined)}
                  className="bg-[#2D3436] border border-[#3D4446] rounded px-2 py-1.5 text-xs text-gray-300"
                >
                  <option value="">全部媒体</option>
                  <option value="人民日报">人民日报</option>
                  <option value="新华社">新华社</option>
                  <option value="经济日报">经济日报</option>
                </select>
                <Input
                  type="date"
                  value={filters.dateFrom ?? ""}
                  onChange={(e) => setFilter("dateFrom", e.target.value || undefined)}
                  className="bg-[#2D3436] border-[#3D4446] text-gray-200 text-xs h-8 w-36"
                  placeholder="起始日期"
                />
                <Input
                  type="date"
                  value={filters.dateTo ?? ""}
                  onChange={(e) => setFilter("dateTo", e.target.value || undefined)}
                  className="bg-[#2D3436] border-[#3D4446] text-gray-200 text-xs h-8 w-36"
                  placeholder="结束日期"
                />
                {(filters.search || filters.media || filters.dateFrom || filters.dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      resetFilters();
                      setSearchInput("");
                    }}
                    className="text-xs text-gray-400 h-8"
                  >
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
                <Card className="border-red-500/30 bg-red-500/5">
                  <CardContent className="p-4 text-xs text-red-400">{error}</CardContent>
                </Card>
              ) : articles.length === 0 ? (
                <EmptyState
                  icon={Newspaper}
                  title="暂无文章"
                  description="使用上方采集面板开始采集国内媒体文章"
                />
              ) : (
                <div className="space-y-2">
                  {/* Article Cards */}
                  {articles.map((article) => {
                    const aiMeta = (article.metadata as Record<string, unknown>)?.domestic_ai_analysis as Record<string, unknown> | undefined;
                    const hasAi = !!aiMeta;
                    const sentiment = (aiMeta?.sentiment as Record<string, string>)?.polarity;

                    return (
                      <Card
                        key={article.id}
                        className="border-[#3D4446] bg-[#1A1D1E] hover:border-[#4A90A4]/50 transition-colors cursor-pointer"
                        onClick={() => fetchArticle(article.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm text-gray-200 leading-snug truncate">
                                {article.title}
                              </h3>
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
                                <span>{article.media}</span>
                                <span>{article.publish_date}</span>
                                <span>{article.word_count} 字</span>
                                {article.author && <span>{article.author}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {hasAi && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  sentiment === "positive" ? "bg-emerald-500/20 text-emerald-400" :
                                  sentiment === "negative" ? "bg-red-500/20 text-red-400" :
                                  "bg-gray-500/20 text-gray-400"
                                }`}>
                                  {sentiment === "positive" ? "正面" : sentiment === "negative" ? "负面" : "中性"}
                                </span>
                              )}
                              {!hasAi && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerAnalysis(article.id);
                                  }}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-[#2D3436] text-gray-400 hover:text-[#4A90A4] transition-colors"
                                  title="执行AI分析"
                                >
                                  <Brain className="h-3 w-3" />
                                </button>
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
                      <span className="text-xs text-gray-500">
                        共 {total} 篇 · 第 {page}/{totalPages} 页
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPage(page - 1)}
                          disabled={page <= 1}
                          className="h-7 text-xs text-gray-400"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPage(page + 1)}
                          disabled={page >= totalPages}
                          className="h-7 text-xs text-gray-400"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {tab === "dashboard" && <AnalysisDashboard />}
        </>
      )}
    </div>
  );
}
