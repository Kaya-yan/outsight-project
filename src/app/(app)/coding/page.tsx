"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/articles/status-badge";
import { MyTasksList } from "@/components/coding/my-tasks-list";
import { ArticleSelector } from "@/components/shared/article-selector";
import { MemberSelector } from "@/components/shared/member-selector";
import { useAuthStore, selectIsTeamLead, selectCanReview } from "@/stores/auth-store";
import { useTaskStore } from "@/stores/task-store";
import { MEDIA_OUTLETS, RESEARCH_PERIODS } from "@/lib/constants";
import { Code2, Search, ArrowRight, Users, UserPlus, Inbox } from "lucide-react";

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
  const isTeamLead = useAuthStore(selectIsTeamLead);
  const { user } = useAuthStore();
  const { tasks, isLoading: tasksLoading, loadTasks, createTask } = useTaskStore();

  const [tab, setTab] = useState<"my_tasks" | "manage" | "solo">("my_tasks");

  // Task pool
  const [poolTasks, setPoolTasks] = useState<TaskRow[]>([]);
  const [poolLoading, setPoolLoading] = useState(false);

  // Solo coding article list (backward compat)
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mediaFilter, setMediaFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");

  // Create task dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createArticleId, setCreateArticleId] = useState("");
  const [createTaskType, setCreateTaskType] = useState<"solo" | "dual">("solo");
  const [createCoderA, setCreateCoderA] = useState("");
  const [createCoderB, setCreateCoderB] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  // Load my tasks + pool on mount
  useEffect(() => {
    loadTasks({ my: true });
    loadPoolTasks();
  }, [loadTasks]);

  async function loadPoolTasks() {
    setPoolLoading(true);
    try {
      const res = await fetch("/api/tasks?pool=1&pageSize=50");
      if (res.ok) {
        const json = await res.json();
        setPoolTasks((json.data ?? []) as TaskRow[]);
      }
    } catch {
      // silent
    }
    setPoolLoading(false);
  }

  async function handleClaimTask(taskId: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/claim`, { method: "POST" });
      if (res.ok) {
        loadPoolTasks();
        loadTasks({ my: true });
      }
    } catch {
      // silent
    }
  }

  // Load solo articles
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
    if (tab === "solo") fetchArticles();
  }, [fetchArticles, tab]);

  // Create task handler
  async function handleCreateTask() {
    setCreateError("");
    if (!createArticleId) {
      setCreateError("请选择一篇文章");
      return;
    }
    if (createTaskType === "dual" && !createCoderB) {
      setCreateError("双人编码需指定编码员B");
      return;
    }
    if (createTaskType === "dual" && createCoderA === createCoderB) {
      setCreateError("两个编码员不能相同");
      return;
    }
    setCreateSubmitting(true);
    try {
      // __pool__ sentinel = put task in pool (no assignee)
      const actualCoderA = createCoderA === "__pool__" ? "" : createCoderA;
      const actualCoderB = createCoderB === "__pool__" ? "" : createCoderB;
      await createTask({
        article_id: createArticleId,
        task_type: createTaskType,
        coder_a_id: actualCoderA || undefined,
        coder_b_id: (createTaskType === "dual" && actualCoderB) ? actualCoderB : undefined,
      });
      setShowCreate(false);
      setCreateArticleId("");
      setCreateCoderA("");
      setCreateCoderB("");
      loadTasks({ my: true });
      loadPoolTasks();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "创建失败");
    }
    setCreateSubmitting(false);
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#2D3436]">编码实验室</h1>
          <p className="mt-0.5 text-sm text-[#7F8A93]">
            {tab === "my_tasks" ? "我的编码任务" : tab === "manage" ? "任务管理与审核" : "快速单人编码"}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-md overflow-hidden border border-[#E2E5E9]">
          <button
            type="button"
            onClick={() => setTab("my_tasks")}
            className={`px-3 py-1.5 text-xs ${tab === "my_tasks" ? "bg-[#4A90A4] text-white" : "bg-white text-[#7F8A93] hover:bg-[#F0F2F5]"}`}
          >
            <Code2 className="h-3.5 w-3.5 inline mr-1" />
            我的任务
          </button>
          <button
            type="button"
            onClick={() => setTab("solo")}
            className={`px-3 py-1.5 text-xs ${tab === "solo" ? "bg-[#4A90A4] text-white" : "bg-white text-[#7F8A93] hover:bg-[#F0F2F5]"}`}
          >
            <Code2 className="h-3.5 w-3.5 inline mr-1" />
            单人编码
          </button>
          {isTeamLead && (
            <button
              type="button"
              onClick={() => { setTab("manage"); loadTasks(); }}
              className={`px-3 py-1.5 text-xs ${tab === "manage" ? "bg-[#4A90A4] text-white" : "bg-white text-[#7F8A93] hover:bg-[#F0F2F5]"}`}
            >
              <Users className="h-3.5 w-3.5 inline mr-1" />
              任务管理
            </button>
          )}
        </div>
      </div>

      {/* Tab: My Tasks */}
      {tab === "my_tasks" && (
        <div className="space-y-4">
          {/* My active tasks */}
          <Card className="border-[#E2E5E9] shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Code2 className="h-4 w-4 text-[#4A90A4]" />
                <h3 className="text-sm font-medium text-[#2D3436]">我的任务</h3>
              </div>
              <MyTasksList
                tasks={tasks as TaskRow[]}
                isLoading={tasksLoading}
                currentUserId={user?.id ?? ""}
              />
            </CardContent>
          </Card>

          {/* Task Pool */}
          <Card className="border-[#E2E5E9] shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Inbox className="h-4 w-4 text-[#E67E22]" />
                <h3 className="text-sm font-medium text-[#2D3436]">任务池</h3>
                <span className="text-[10px] text-[#95A5A6]">可自由认领的开放任务</span>
              </div>
              <MyTasksList
                tasks={poolTasks}
                isLoading={poolLoading}
                currentUserId={user?.id ?? ""}
                mode="pool"
                onClaim={handleClaimTask}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Solo Coding (backward compat) */}
      {tab === "solo" && (
        <>
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

          <Card className="border-[#E2E5E9] shadow-card">
            <CardContent className="p-0">
              {isLoading ? (
                <p className="p-6 text-center text-sm text-[#7F8A93]">加载中...</p>
              ) : articles.length === 0 ? (
                <div className="p-12">
                  <EmptyState
                    icon={Code2}
                    title="暂无可编码语料"
                    description="语料需先完成清洗和预读后，状态变为「待编码」才会出现在此列表。上传全文后系统会自动处理。"
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

      {/* Tab: Task Management (admin/lead) */}
      {tab === "manage" && isTeamLead && (
        <div className="space-y-4">
          {/* Create task button */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <select
                value={createTaskType}
                onChange={(e) => setCreateTaskType(e.target.value as "solo" | "dual")}
                className="h-8 rounded border border-[#E2E5E9] bg-white px-2 text-xs"
              >
                <option value="">全部类型</option>
                <option value="solo">单人编码</option>
                <option value="dual">双人编码</option>
              </select>
            </div>
            <Button
              onClick={() => setShowCreate(!showCreate)}
              className="h-8 text-xs gap-1 bg-[#4A90A4] hover:bg-[#3D7D8F] text-white"
            >
              <UserPlus className="h-3.5 w-3.5" />
              创建任务
            </Button>
          </div>

          {/* Create task dialog */}
          {showCreate && (
            <Card className="border-[#4A90A4]/30 bg-[#4A90A4]/5">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-medium text-[#2D3436]">创建编码任务</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-[#7F8A93] block mb-1">选择文章</label>
                    <ArticleSelector
                      value={createArticleId}
                      onChange={setCreateArticleId}
                      placeholder="搜索待编码文章..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#7F8A93] block mb-1">任务类型</label>
                    <select
                      value={createTaskType}
                      onChange={(e) => setCreateTaskType(e.target.value as "solo" | "dual")}
                      className="h-9 rounded border border-[#E2E5E9] bg-white px-2 text-xs w-full"
                    >
                      <option value="solo">单人编码</option>
                      <option value="dual">双人编码</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#7F8A93] block mb-1">编码员A</label>
                    <MemberSelector
                      value={createCoderA}
                      onChange={setCreateCoderA}
                      placeholder="选择成员..."
                      allowPool
                    />
                  </div>
                  {createTaskType === "dual" && (
                    <div className="col-span-2">
                      <label className="text-xs text-[#7F8A93] block mb-1">编码员B</label>
                      <MemberSelector
                        value={createCoderB}
                        onChange={setCreateCoderB}
                        excludeId={createCoderA || undefined}
                        placeholder="选择编码员B..."
                      />
                    </div>
                  )}
                </div>
                {createError && (
                  <p className="text-xs text-[#E67E22]">{createError}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <Button onClick={() => setShowCreate(false)} variant="outline" className="h-8 text-xs">
                    取消
                  </Button>
                  <Button
                    onClick={handleCreateTask}
                    disabled={createSubmitting}
                    className="h-8 text-xs bg-[#4A90A4] hover:bg-[#3D7D8F] text-white"
                  >
                    {createSubmitting ? "创建中..." : "确认创建"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* All tasks list */}
          <Card className="border-[#E2E5E9] shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-[#4A90A4]" />
                <h3 className="text-sm font-medium text-[#2D3436]">全部任务</h3>
              </div>
              <MyTasksList
                tasks={tasks as TaskRow[]}
                isLoading={tasksLoading}
                currentUserId={user?.id ?? ""}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
