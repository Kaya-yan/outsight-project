"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, CheckCircle2, XCircle, Clock, Play } from "lucide-react";

interface CrawlStats {
  totalFetched: number;
  totalInserted: number;
  sourceBreakdown: {
    rss: number;
    newsapi: number;
    gdelt: number;
    search: number;
  };
  filterBreakdown: {
    duplicate_url: number;
    out_of_date_range_before: number;
    out_of_date_range_after: number;
    missing_publish_date: number;
    unparseable_date: number;
    hash_error: number;
  };
}

interface JobStatus {
  job_id: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  total_fetched: number;
  total_new: number;
  error_message: string | null;
}

interface SyncPanelProps {
  onSyncComplete?: () => void;
}

const FILTER_LABELS: Record<keyof CrawlStats["filterBreakdown"], string> = {
  duplicate_url: "URL重复",
  out_of_date_range_before: "早于研究范围(2022-10前)",
  out_of_date_range_after: "晚于研究范围(2024-12后)",
  missing_publish_date: "缺少发布日期",
  unparseable_date: "日期无法解析",
  hash_error: "URL哈希错误",
};

export function SyncPanel({ onSyncComplete }: SyncPanelProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [crawlStats, setCrawlStats] = useState<CrawlStats | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback((jobId: string) => {
    stopPolling();

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/crawl/status/${jobId}`);
        if (!res.ok) return;

        const json = await res.json();
        setJobStatus(json);

        if (json.status === "completed" || json.status === "failed") {
          stopPolling();
          if (json.status === "completed") {
            onSyncComplete?.();
          }
        }
      } catch {
        // Polling silently retries
      }
    }, 3000);
  }, [stopPolling, onSyncComplete]);

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    setJobStatus(null);
    setCrawlStats(null);

    try {
      const startRes = await fetch("/api/crawl/start", { method: "POST" });
      const startJson = await startRes.json();

      if (!startRes.ok || !startJson.job_id) {
        setError(startJson.error ?? "任务创建失败");
        setIsStarting(false);
        return;
      }

      const jobId = startJson.job_id;

      setJobStatus({
        job_id: jobId,
        status: "pending",
        progress: 0,
        total_fetched: 0,
        total_new: 0,
        error_message: null,
      });

      startPolling(jobId);

      const execRes = await fetch("/api/crawl/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });

      const execJson = await execRes.json().catch(() => ({}));

      if (!execRes.ok) {
        setError(`执行引擎失败: ${(execJson as { error?: string }).error ?? execRes.status}`);
      } else if (execJson.stats) {
        setCrawlStats(execJson.stats as CrawlStats);
      }
    } catch {
      setError("网络连接失败");
    } finally {
      setIsStarting(false);
    }
  }, [startPolling]);

  const isRunning = jobStatus?.status === "pending" || jobStatus?.status === "running";

  return (
    <Card className="border-[#E2E5E9] shadow-card">
      <CardContent className="p-4">
        {/* Header row: description + button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <RefreshCw className="h-4 w-4 text-[#4A90A4] animate-spin" />
            ) : jobStatus?.status === "completed" ? (
              <CheckCircle2 className="h-4 w-4 text-[#5DAD93]" />
            ) : jobStatus?.status === "failed" ? (
              <XCircle className="h-4 w-4 text-[#E67E22]" />
            ) : (
              <Clock className="h-4 w-4 text-[#7F8A93]" />
            )}
            <span className="text-sm text-[#2D3436]">
              {jobStatus
                ? `任务 ${jobStatus.job_id.slice(0, 8)}...`
                : "BBC · 3数据源 + 搜索 · 仅元数据"}
            </span>
          </div>

          <Button
            onClick={handleStart}
            disabled={isStarting || isRunning}
            variant="outline"
            className="h-8 text-xs gap-1.5"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                采集中...
              </>
            ) : isStarting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                启动中...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                开始采集
              </>
            )}
          </Button>
        </div>

        {/* Progress bar + details */}
        {jobStatus && (
          <div className="mt-3 space-y-2">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-[#F0F2F5] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    jobStatus.status === "failed"
                      ? "bg-[#E67E22]"
                      : jobStatus.status === "completed"
                        ? "bg-[#5DAD93]"
                        : "bg-[#4A90A4]"
                  }`}
                  style={{ width: `${jobStatus.progress}%` }}
                />
              </div>
              <span className="text-xs font-mono text-[#7F8A93] w-10 text-right">
                {jobStatus.progress}%
              </span>
            </div>

            {/* Status text */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#7F8A93]">
                {jobStatus.status === "pending" && "任务已创建，正在启动执行引擎..."}
                {jobStatus.status === "running" && `正在采集... 已拉取 ${jobStatus.total_fetched} 篇`}
                {jobStatus.status === "completed" && (() => {
                  const filtered = jobStatus.total_fetched - jobStatus.total_new;
                  if (jobStatus.total_fetched === 0) return "采集完成 · 未发现任何文章";
                  if (jobStatus.total_new === 0) return `采集完成 · 发现 ${jobStatus.total_fetched} 篇，但全部被过滤，未入库`;
                  return `采集完成 · 发现 ${jobStatus.total_fetched} 篇，入库 ${jobStatus.total_new} 篇`;
                })()}
                {jobStatus.status === "failed" && `任务失败: ${jobStatus.error_message ?? "未知错误"}`}
              </span>
              {isRunning && (
                <span className="text-[#95A5A6]">每 3 秒刷新</span>
              )}
            </div>

            {/* Running: show actual scope */}
            {isRunning && (
              <div className="text-xs text-[#95A5A6] mt-1">
                数据源: RSS 订阅源 + NewsAPI + GDELT 关键词 + 搜索引擎(Bing→Serper→Google fallback)
              </div>
            )}

            {/* Completed: source breakdown */}
            {jobStatus.status === "completed" && crawlStats && (
              <div className="text-xs text-[#7F8A93] space-y-1 mt-1">
                <p className="font-medium text-[#2D3436]">各数据源发现数量：</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  <span>RSS 订阅源: {crawlStats.sourceBreakdown.rss} 篇</span>
                  <span>NewsAPI: {crawlStats.sourceBreakdown.newsapi} 篇</span>
                  <span>GDELT: {crawlStats.sourceBreakdown.gdelt} 篇</span>
                  <span>搜索引擎: {crawlStats.sourceBreakdown.search} 篇</span>
                </div>
              </div>
            )}

            {/* Completed: filter breakdown — only when data exists */}
            {jobStatus.status === "completed" && crawlStats && crawlStats.totalFetched > 0 && (
              <div className="text-xs text-[#7F8A93] space-y-1 mt-1">
                <p className="font-medium text-[#2D3436]">
                  {crawlStats.totalInserted === 0 ? "全部被过滤，原因明细：" : "过滤明细："}
                </p>
                {Object.entries(crawlStats.filterBreakdown)
                  .filter(([, count]) => count > 0)
                  .map(([key, count]) => (
                    <p key={key}>
                      {FILTER_LABELS[key as keyof CrawlStats["filterBreakdown"]] ?? key}: {count} 篇
                    </p>
                  ))}
                {Object.values(crawlStats.filterBreakdown).every((c) => c === 0) && (
                  <p>所有文章通过检查</p>
                )}
              </div>
            )}

            {/* Completed but no stats: explain */}
            {jobStatus.status === "completed" && !crawlStats && jobStatus.total_fetched > 0 && (
              <div className="text-xs text-[#95A5A6] mt-1">
                过滤原因明细（重复URL、超时间范围、日期缺失等）请查看 Vercel Runtime Logs
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 rounded-md bg-[#E67E22]/5 px-3 py-2 text-sm text-[#E67E22]">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
