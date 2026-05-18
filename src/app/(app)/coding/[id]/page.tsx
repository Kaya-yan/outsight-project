"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useCodingStore } from "@/stores/coding-store";
import { useTaskStore } from "@/stores/task-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/articles/status-badge";
import { AiPanel } from "@/components/coding/ai-panel";
import { TranslationAssistant } from "@/components/coding/translation-assistant";
import { FrameworkTree } from "@/components/coding/framework-tree";
import { AnnotationForm } from "@/components/coding/annotation-form";
import { AnnotationList } from "@/components/coding/annotation-list";
import type { Annotation, CodingNode } from "@/types/database";
import { ArrowLeft, FileText, CheckCircle2 } from "lucide-react";
import { NightBanner } from "@/components/shared/night-banner";

const TASK_STATUS_LABELS: Record<string, string> = {
  open: "待开始",
  in_progress: "进行中",
  completed: "已完成",
  reviewed: "已终审",
};

export default function CodingWorkspacePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const articleId = params.id as string;
  const taskId = searchParams.get("task_id");

  const {
    article,
    annotations,
    frameworks,
    nodes,
    selectedNode,
    selectedText,
    isLoading,
    isSubmitting,
    loadArticle,
    loadFrameworks,
    loadAnnotations,
    loadFrameworkNodes,
    setSelectedNode,
    setCurrentTaskId,
    submitAnnotation,
    deleteAnnotation,
  } = useCodingStore();

  const {
    selectedTask,
    loadTaskDetail,
    submitTask,
  } = useTaskStore();

  const [showForm, setShowForm] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [activeFrameworkId, setActiveFrameworkId] = useState<string | null>(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Set task context
  useEffect(() => {
    setCurrentTaskId(taskId);
  }, [taskId, setCurrentTaskId]);

  // Load task detail if task_id present
  useEffect(() => {
    if (taskId) {
      loadTaskDetail(taskId);
    }
  }, [taskId, loadTaskDetail]);

  useEffect(() => {
    loadArticle(articleId);
    loadFrameworks();
  }, [articleId, loadArticle, loadFrameworks]);

  useEffect(() => {
    if (article) {
      loadAnnotations(article.id);
    }
  }, [article, loadAnnotations]);

  useEffect(() => {
    if (frameworks.length > 0 && !activeFrameworkId) {
      const fwId = frameworks[0].id;
      setActiveFrameworkId(fwId);
      loadFrameworkNodes(fwId);
    }
  }, [frameworks, activeFrameworkId, loadFrameworkNodes]);

  // Capture text selection in the article reading area
  useEffect(() => {
    function handleSelection() {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (text && text.length > 0) {
        useCodingStore.getState().setSelectedText(text);
      }
    }
    document.addEventListener("mouseup", handleSelection);
    return () => document.removeEventListener("mouseup", handleSelection);
  }, []);

  const handleNodeSelect = useCallback((node: CodingNode) => {
    setSelectedNode(node);
    setShowForm(true);
    setEditingAnnotation(null);
  }, [setSelectedNode]);

  const handleFormSubmit = useCallback(async (data: {
    node_id: string;
    quote_text?: string;
    confidence: number;
    note?: string;
  }) => {
    if (editingAnnotation) {
      // Update existing annotation
      try {
        await fetch(`/api/annotations/${editingAnnotation.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        await loadAnnotations(articleId);
        setShowForm(false);
        setEditingAnnotation(null);
        setSelectedNode(null);
      } catch {
        // Silent
      }
    } else {
      const ok = await submitAnnotation(data);
      if (ok) {
        setShowForm(false);
        setSelectedNode(null);
      }
    }
  }, [editingAnnotation, articleId, loadAnnotations, submitAnnotation, setSelectedNode]);

  const handleEditAnnotation = useCallback((a: Annotation) => {
    const node = nodes.find((n) => n.id === a.node_id);
    if (node) {
      setSelectedNode(node);
      setEditingAnnotation(a);
      setShowForm(true);
    }
  }, [nodes, setSelectedNode]);

  const handleDeleteAnnotation = useCallback(async (a: Annotation) => {
    await deleteAnnotation(a.id);
  }, [deleteAnnotation]);

  const handleSubmitTask = useCallback(async () => {
    if (!taskId) return;
    setIsSubmittingTask(true);
    await submitTask(taskId);
    setIsSubmittingTask(false);
  }, [taskId, submitTask]);

  const handlePreReadComplete = useCallback(() => {
    loadArticle(articleId);
  }, [articleId, loadArticle]);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-7xl">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-[600px] flex-1" />
          <Skeleton className="h-[600px] w-[360px]" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[#E67E22]">未找到该语料</p>
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          className="mt-3 h-8 text-xs"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          返回
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-7xl">
      {/* Night research banner */}
      <NightBanner />

      {/* Task context banner */}
      {selectedTask && (
        <div className="flex items-center gap-3 px-3 py-2 rounded border border-[#4A90A4]/20 bg-[#4A90A4]/5">
          <div className="flex-1 flex items-center gap-2 text-xs">
            <span className="text-[#7F8A93]">任务</span>
            <Badge className={`text-[10px] ${
              selectedTask.task_type === "dual"
                ? "bg-[#E67E22]/10 text-[#E67E22]"
                : "bg-[#4A90A4]/10 text-[#4A90A4]"
            }`}>
              {selectedTask.task_type === "solo" ? "单人编码" : "双人编码"}
            </Badge>
            <Badge className="text-[10px] bg-[#7F8A93]/10 text-[#7F8A93]">
              {TASK_STATUS_LABELS[selectedTask.status] ?? selectedTask.status}
            </Badge>
          </div>
          {selectedTask.status !== "completed" && selectedTask.status !== "reviewed" && (
            <Button
              onClick={handleSubmitTask}
              disabled={isSubmittingTask}
              className="h-7 text-xs gap-1 bg-[#5DAD93] hover:bg-[#4C9A82] text-white"
            >
              <CheckCircle2 className="h-3 w-3" />
              {isSubmittingTask ? "提交中..." : "提交完成"}
            </Button>
          )}
          {selectedTask.status === "completed" && (
            <span className="text-xs text-[#5DAD93] flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              已提交，等待审核
            </span>
          )}
          {selectedTask.status === "reviewed" && (
            <span className="text-xs text-[#2D3436] flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              已终审
            </span>
          )}
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            onClick={() => window.history.back()}
            variant="ghost"
            className="h-8 w-8 p-0 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-[#2D3436] truncate">
              {article.title}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[#7F8A93]">{article.media}</span>
              {article.period && (
                <span className="text-xs text-[#7F8A93]">{article.period}</span>
              )}
              <StatusBadge status={article.status} size="sm" />
              {article.word_count && (
                <span className="text-xs text-[#95A5A6]">{article.word_count} 词</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content: two columns */}
      <div className="flex gap-4">
        {/* Left: Article text */}
        <div className="flex-1 min-w-0">
          <Card className="border-[#E2E5E9] shadow-card h-[calc(100vh-160px)] overflow-hidden flex flex-col">
            <CardContent className="p-4 flex-1 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3 text-xs text-[#7F8A93]">
                <FileText className="h-3.5 w-3.5" />
                <span>原文阅读</span>
                <span className="text-[#95A5A6]">
                  · 选中文字后可在右侧框架树创建标注
                </span>
              </div>
              <div
                id="article-content"
                className="text-sm leading-relaxed text-[#2D3436] whitespace-pre-wrap"
              >
                {article.content || article.full_text || "暂无正文内容"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Tools panel */}
        <div className="w-[380px] shrink-0 space-y-3 overflow-y-auto max-h-[calc(100vh-140px)]">
          {/* Translation Assistant */}
          <TranslationAssistant />

          {/* AI Panel */}
          <AiPanel
            articleId={article.id}
            articleStatus={article.status}
            onPreReadComplete={handlePreReadComplete}
          />

          {/* Framework Tabs */}
          {frameworks.length > 1 && (
            <div className="flex gap-1">
              {frameworks.map((fw) => (
                <button
                  key={fw.id}
                  type="button"
                  onClick={() => {
                    setActiveFrameworkId(fw.id);
                    loadFrameworkNodes(fw.id);
                  }}
                  className={`text-xs px-2 py-1 rounded ${
                    activeFrameworkId === fw.id
                      ? "bg-[#4A90A4] text-white"
                      : "bg-[#F0F2F5] text-[#7F8A93] hover:bg-[#E2E5E9]"
                  }`}
                >
                  {fw.name_zh || fw.name}
                </button>
              ))}
            </div>
          )}

          {/* Framework Tree */}
          <Card className="border-[#E2E5E9] shadow-card">
            <CardContent className="p-3">
              <h3 className="text-xs font-medium text-[#7F8A93] mb-2">
                {showForm ? "标注表单" : "编码框架"}
              </h3>

              {showForm && selectedNode ? (
                <AnnotationForm
                  node={selectedNode}
                  quoteText={editingAnnotation?.quote_text ?? selectedText}
                  existingConfidence={editingAnnotation?.confidence ?? undefined}
                  existingNote={editingAnnotation?.note ?? undefined}
                  onSubmit={handleFormSubmit}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingAnnotation(null);
                    setSelectedNode(null);
                  }}
                  isSubmitting={isSubmitting}
                />
              ) : activeFrameworkId ? (
                <FrameworkTree
                  frameworkId={activeFrameworkId}
                  onSelectNode={handleNodeSelect}
                />
              ) : frameworks.length === 0 ? (
                <p className="text-xs text-[#95A5A6] py-4 text-center">
                  暂无编码框架，请管理员在
                  <a href="/settings" className="text-[#4A90A4] underline mx-0.5">系统设置</a>
                  中创建编码框架
                </p>
              ) : (
                <p className="text-xs text-[#95A5A6] py-4 text-center">请选择编码框架</p>
              )}
            </CardContent>
          </Card>

          {/* Existing Annotations */}
          <Card className="border-[#E2E5E9] shadow-card">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-[#7F8A93]">
                  我的标注 ({annotations.length})
                </h3>
              </div>
              <AnnotationList
                annotations={annotations}
                nodes={nodes}
                onEdit={handleEditAnnotation}
                onDelete={handleDeleteAnnotation}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
