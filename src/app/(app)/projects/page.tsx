"use client";

import { useEffect, useState, useCallback } from "react";
import { useArticleStore } from "@/stores/article-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { ArticleTable } from "@/components/articles/article-table";
import { ArticleForm } from "@/components/articles/article-form";
import { StatusFlow } from "@/components/articles/status-flow";
import { FileUpload } from "@/components/articles/file-upload";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/articles/status-badge";
import { SyncPanel } from "@/components/articles/sync-panel";
import { ContentCompletionPanel } from "@/components/articles/content-completion-panel";
import { MEDIA_OUTLETS, RESEARCH_PERIODS, ARTICLE_STATUS_LABELS } from "@/lib/constants";
import type { Article, ArticleStatus } from "@/types/database";
import { FolderOpen, Plus, Upload, X } from "lucide-react";

const ALL_STATUSES = Object.keys(ARTICLE_STATUS_LABELS);

export default function ProjectsPage() {
  const {
    filters,
    page,
    pageSize,
    total,
    selectedIds,
    articles,
    isLoading,
    error,
    setFilter,
    resetFilters,
    setPage,
    toggleSelect,
    selectAll,
    clearSelection,
    fetchArticles,
  } = useArticleStore();

  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [statusFlowArticle, setStatusFlowArticle] = useState<Article | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Article | null>(null);
  const [batchStatus, setBatchStatus] = useState<ArticleStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleCreate = useCallback(async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setShowCreate(false);
        fetchArticles();
      } else {
        const json = await res.json();
        alert(json.error ?? "创建失败");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchArticles]);

  const handleUpdate = useCallback(async (data: Record<string, unknown>) => {
    if (!editingArticle) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/articles/${editingArticle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setEditingArticle(null);
        fetchArticles();
      } else {
        const json = await res.json();
        alert(json.error ?? "更新失败");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [editingArticle, fetchArticles]);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    console.log(`[Frontend] Delete triggered: id=${deleteConfirm.id}, title=${deleteConfirm.title}`);
    try {
      const res = await fetch(`/api/articles/${deleteConfirm.id}`, { method: "DELETE" });
      console.log(`[Frontend] Delete response: status=${res.status}, ok=${res.ok}`);

      if (res.ok) {
        console.log(`[Frontend] Delete succeeded, refreshing list...`);
        setDeleteConfirm(null);
        fetchArticles();
      } else {
        const json = await res.json();
        console.error(`[Frontend] Delete failed:`, json);
        alert(json.error ?? "删除失败");
      }
    } catch (err) {
      console.error(`[Frontend] Delete network error:`, err);
      alert("删除失败");
    }
  }, [deleteConfirm, fetchArticles]);

  const handleStatusChange = useCallback(async (article: Article, newStatus: ArticleStatus) => {
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatusFlowArticle(null);
        fetchArticles();
      } else {
        const json = await res.json();
        alert(json.error ?? "状态变更失败");
      }
    } catch {
      alert("状态变更失败");
    }
  }, [fetchArticles]);

  const handleBatchStatusChange = useCallback(async () => {
    if (!batchStatus || selectedIds.length === 0) return;
    try {
      const res = await fetch("/api/articles/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleIds: selectedIds, newStatus: batchStatus }),
      });
      if (res.ok) {
        setBatchStatus(null);
        clearSelection();
        fetchArticles();
      } else {
        const json = await res.json();
        alert(json.error ?? "批量操作失败");
      }
    } catch {
      alert("批量操作失败");
    }
  }, [batchStatus, selectedIds, clearSelection, fetchArticles]);

  const handleUpload = useCallback(async (file: File, meta?: { title?: string; media?: string }) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (meta?.title) formData.append("title", meta.title);
      if (meta?.media) formData.append("media", meta.media);
      const res = await fetch("/api/articles/upload", { method: "POST", body: formData });
      if (res.ok) {
        setShowUpload(false);
        fetchArticles();
      } else {
        const json = await res.json();
        alert(json.error ?? "上传失败");
      }
    } catch {
      alert("上传失败");
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchArticles]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasActiveFilters = filters.media || filters.period || filters.status || filters.search;

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#2D3436]">语料工作台</h1>
          <p className="mt-0.5 text-sm text-[#7F8A93]">
            管理新闻语料 · 状态流转 · 批量操作
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowUpload(true)}
            variant="outline"
            className="h-9 text-sm gap-1.5"
          >
            <Upload className="h-4 w-4" />
            批量上传
          </Button>
          <Button
            onClick={() => setShowCreate(true)}
            className="h-9 text-sm gap-1.5 bg-[#4A90A4] hover:bg-[#3D7D8F] text-white"
          >
            <Plus className="h-4 w-4" />
            新建语料
          </Button>
        </div>
      </div>

      <Separator />

      {/* Sync Panel */}
      <SyncPanel onSyncComplete={fetchArticles} />

      {/* Content Completion Panel */}
      <ContentCompletionPanel onComplete={fetchArticles} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.media ?? ""}
          onChange={(e) => setFilter("media", e.target.value || undefined)}
          className="h-9 rounded-md border border-[#E2E5E9] bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4]"
        >
          <option value="">全部媒体</option>
          {MEDIA_OUTLETS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <select
          value={filters.period ?? ""}
          onChange={(e) => setFilter("period", e.target.value || undefined)}
          className="h-9 rounded-md border border-[#E2E5E9] bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4]"
        >
          <option value="">全部时段</option>
          {RESEARCH_PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <select
          value={filters.status ?? ""}
          onChange={(e) => setFilter("status", e.target.value || undefined)}
          className="h-9 rounded-md border border-[#E2E5E9] bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4]"
        >
          <option value="">全部状态</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Input
            placeholder="搜索标题/摘要/正文..."
            value={filters.search ?? ""}
            onChange={(e) => setFilter("search", e.target.value || undefined)}
            className="h-9 pl-3 pr-8 border-[#E2E5E9] focus-visible:ring-[#4A90A4] text-sm"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilter("search", undefined)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#95A5A6] hover:text-[#2D3436]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={resetFilters}
            className="h-9 text-sm text-[#7F8A93]"
          >
            重置
          </Button>
        )}
      </div>

      {/* Batch action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-md bg-[#4A90A4]/5 px-4 py-2 text-sm">
          <span className="text-[#2D3436]">
            已选 {selectedIds.length} 篇
          </span>
          <select
            value={batchStatus ?? ""}
            onChange={(e) => setBatchStatus((e.target.value || null) as ArticleStatus | null)}
            className="h-8 rounded border border-[#E2E5E9] bg-white px-2 text-xs"
          >
            <option value="">批量变更状态...</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {batchStatus && (
            <Button
              onClick={handleBatchStatusChange}
              className="h-8 text-xs bg-[#5DAD93] hover:bg-[#4E9A81] text-white"
            >
              执行
            </Button>
          )}
          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto text-xs text-[#7F8A93] hover:text-[#2D3436]"
          >
            取消选择
          </button>
        </div>
      )}

      {/* Content */}
      <Card className="border-[#E2E5E9] shadow-card">
        <CardContent className="p-0">
          {/* Error state */}
          {error && (
            <div className="p-6 text-center">
              <p className="text-sm text-[#E67E22] mb-3">{error}</p>
              <Button onClick={fetchArticles} variant="outline" className="h-8 text-sm">
                重试
              </Button>
            </div>
          )}

          {/* Data / Loading / Empty */}
          {!error && (
            <>
              <ArticleTable
                articles={articles}
                isLoading={isLoading}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onSelectAll={selectAll}
                onEdit={(a) => setEditingArticle(a)}
                onDelete={(a) => setDeleteConfirm(a)}
                onStatusChange={(a, s) => handleStatusChange(a, s)}
              />

              {/* Pagination */}
              {total > pageSize && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E5E9]">
                  <span className="text-xs text-[#7F8A93]">
                    共 {total} 篇，第 {page}/{totalPages} 页
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      className="h-8 text-xs"
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                      className="h-8 text-xs"
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty state (not loading, no error, no data) */}
          {!isLoading && !error && articles.length === 0 && !hasActiveFilters && (
            <div className="p-12">
              <EmptyState
                icon={FolderOpen}
                title="暂无语料"
                description="点击「新建语料」录入第一篇语料，或上传 txt/html 文件批量导入。"
              />
            </div>
          )}

          {/* Empty state with filters active */}
          {!isLoading && !error && articles.length === 0 && hasActiveFilters && (
            <div className="p-12">
              <EmptyState
                icon={FolderOpen}
                title="无匹配结果"
                description="尝试调整筛选条件或搜索关键词。"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Flow Dialog */}
      {statusFlowArticle && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setStatusFlowArticle(null)}
          />
          <Card className="relative z-10 w-full max-w-2xl border-[#E2E5E9] shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#2D3436]">
                    {statusFlowArticle.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#7F8A93]">{statusFlowArticle.media}</span>
                    <span className="text-xs text-[#7F8A93]">·</span>
                    <StatusBadge status={statusFlowArticle.status} size="sm" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusFlowArticle(null)}
                  className="text-[#95A5A6] hover:text-[#2D3436]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-[#7F8A93] mb-4">点击可流转状态以变更阶段</p>
              <StatusFlow
                currentStatus={statusFlowArticle.status as ArticleStatus}
                onTransition={(newStatus) =>
                  handleStatusChange(statusFlowArticle, newStatus)
                }
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowCreate(false)}
          />
          <Card className="relative z-10 w-full max-w-2xl max-h-[90vh] border-[#E2E5E9] shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#2D3436]">新建语料</h3>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="text-[#95A5A6] hover:text-[#2D3436]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ArticleForm
                onSubmit={handleCreate}
                onCancel={() => setShowCreate(false)}
                isSubmitting={isSubmitting}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {editingArticle && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setEditingArticle(null)}
          />
          <Card className="relative z-10 w-full max-w-2xl max-h-[90vh] border-[#E2E5E9] shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#2D3436]">编辑语料</h3>
                <button
                  type="button"
                  onClick={() => setEditingArticle(null)}
                  className="text-[#95A5A6] hover:text-[#2D3436]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ArticleForm
                article={editingArticle}
                onSubmit={handleUpdate}
                onCancel={() => setEditingArticle(null)}
                isSubmitting={isSubmitting}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowUpload(false)}
          />
          <Card className="relative z-10 w-full max-w-md border-[#E2E5E9] shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#2D3436]">批量上传语料</h3>
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="text-[#95A5A6] hover:text-[#2D3436]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <FileUpload onUpload={handleUpload} isUploading={isSubmitting} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteConfirm}
        title="删除语料"
        description={`确认删除「${deleteConfirm?.title}」？此操作不可撤销。`}
        confirmLabel="删除"
        variant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
