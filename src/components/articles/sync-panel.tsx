"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, CheckCircle2, XCircle, Clock, Play, AlertTriangle } from "lucide-react";

interface CrawlStats {
  totalFetched: number;
  totalInserted: number;
  sourceBreakdown?: { rss: number; newsapi: number; gdelt: number; search: number };
  filterBreakdown?: Record<string, number>;
}

interface JobStatus {
  job_id: string;
  status: "pending" | "running" | "partial_complete" | "completed" | "failed" | "timeout";
  progress: number;
  total_fetched: number;
  total_new: number;
  error_message: string | null;
  batch_index?: number;
  batch_total?: number;
  current_batch?: { type: string; label: string; status: string } | null;
}

interface SyncPanelProps {
  onSyncComplete?: () => void;
}

export function SyncPanel({ onSyncComplete }: SyncPanelProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [crawlStats, setCrawlStats] = useState<CrawlStats | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    return () => {
      abortRef.current = true;
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
        if (json.current_batch) {
          setBatchProgress(`[${json.batch_index ?? 0}/${json.batch_total ?? "?"}] ${json.current_batch.type}: ${json.current_batch.label}`);
        }
        if (json.status === "completed" || json.status === "partial_complete" || json.status === "failed" || json.status === "timeout") {
          stopPolling();
          if (json.status === "completed" || json.status === "partial_complete") {
            onSyncComplete?.();
          }
        }
      } catch { /* retry */ }
    }, 2000);
  }, [stopPolling, onSyncComplete]);

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    setJobStatus(null);
    setCrawlStats(null);
    setBatchProgress("");
    abortRef.current = false;

    try {
      // Step 1: Create job
      const startRes = await fetch("/api/crawl/start", { method: "POST" });
      const startJson = await startRes.json();

      if (!startRes.ok || !startJson.job_id) {
        setError(startJson.error ?? "任务创建失败");
        setIsStarting(false);
        return;
      }

      const jobId = startJson.job_id;
      const totalBatches = startJson.total_batches ?? 0;

      setJobStatus({
        job_id: jobId,
        status: "pending",
        progress: 0,
        total_fetched: 0,
        total_new: 0,
        error_message: null,
        batch_index: 0,
        batch_total: totalBatches,
      });

      setBatchProgress(`批次 0/${totalBatches}`);
      startPolling(jobId);

      // Step 2: Execute batches sequentially (frontend-driven chain)
      let totalDiscovered = 0;
      let totalInserted = 0;

      for (let batchIdx = 0; batchIdx < totalBatches + 5; batchIdx++) {
        if (abortRef.current) break;

        try {
          const execRes = await fetch("/api/crawl/execute-batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ job_id: jobId }),
          });

          const execJson = await execRes.json();

          if (execJson.total_fetched != null) totalDiscovered = execJson.total_fetched;
          if (execJson.total_new != null) totalInserted = execJson.total_new;

          setBatchProgress(`批次 ${execJson.batch_index ?? batchIdx + 1}/${execJson.batch_total ?? "?"}`);

          setJobStatus((prev) => prev ? {
            ...prev,
            progress: execJson.progress ?? prev.progress,
            batch_index: execJson.batch_index ?? prev.batch_index,
          } : prev);

          if (execJson.done) {
            setCrawlStats({
              totalFetched: totalDiscovered,
              totalInserted: totalInserted,
            });
            break;
          }

          if (!execRes.ok) {
            console.error(`[Frontend] Batch ${batchIdx + 1} HTTP error:`, execRes.status);
            // Continue with next batch — individual failures don't stop the chain
          }
        } catch (err) {
          console.error(`[Frontend] Batch ${batchIdx + 1} network error:`, err);
          // Continue with next batch
        }
      }
    } catch {
      setError("网络连接失败");
    } finally {
      setIsStarting(false);
    }
  }, [startPolling]);

  const isRunning = jobStatus?.status === "pending" || jobStatus?.status === "running";

  // Status icon
  const StatusIcon = () => {
    if (isRunning) return <RefreshCw className="h-4 w-4 text-[#4A90A4] animate-spin" />;
    if (jobStatus?.status === "completed") return <CheckCircle2 className="h-4 w-4 text-[#5DAD93]" />;
    if (jobStatus?.status === "partial_complete") return <AlertTriangle className="h-4 w-4 text-[#E67E22]" />;
    if (jobStatus?.status === "failed" || jobStatus?.status === "timeout") return <XCircle className="h-4 w-4 text-[#E67E22]" />;
    return <Clock className="h-4 w-4 text-[#7F8A93]" />;
  };

  return (
    <Card className="border-[#E2E5E9] shadow-card">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon />
            <span className="text-sm text-[#2D3436]">
              {jobStatus
                ? `任务 ${jobStatus.job_id.slice(0, 8)}... (${jobStatus.status})`
                : "6媒体 · 5时段(2022-2024) · 4数据源 · 仅元数据"}
            </span>
          </div>
          <Button
            onClick={handleStart}
            disabled={isStarting || isRunning}
            variant="outline"
            className="h-8 text-xs gap-1.5"
          >
            {isRunning ? (
              <><RefreshCw className="h-3.5 w-3.5 animate-spin" />采集中...</>
            ) : isStarting ? (
              <><RefreshCw className="h-3.5 w-3.5 animate-spin" />启动中...</>
            ) : (
              <><Play className="h-3.5 w-3.5" />开始采集</>
            )}
          </Button>
        </div>

        {/* Progress + details */}
        {jobStatus && (
          <div className="mt-3 space-y-2">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-[#F0F2F5] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    jobStatus.status === "failed" || jobStatus.status === "timeout"
                      ? "bg-[#E67E22]"
                      : jobStatus.status === "partial_complete"
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

            {/* Batch progress */}
            {batchProgress && (
              <div className="text-xs text-[#4A90A4] font-mono">{batchProgress}</div>
            )}

            {/* Current batch detail */}
            {isRunning && jobStatus.current_batch && (
              <div className="text-xs text-[#95A5A6]">
                当前: [{jobStatus.current_batch.type}] {jobStatus.current_batch.label}
              </div>
            )}

            {/* Status text */}
            <div className="text-xs text-[#7F8A93]">
              {jobStatus.status === "pending" && "任务已创建，准备执行批次..."}
              {jobStatus.status === "running" && `已发现 ${jobStatus.total_fetched} 篇，入库 ${jobStatus.total_new} 篇`}
              {jobStatus.status === "completed" && (() => {
                if (jobStatus.total_fetched === 0) return "采集完成 · 未发现任何文章";
                if (jobStatus.total_new === 0) return `采集完成 · 发现 ${jobStatus.total_fetched} 篇，全部被过滤`;
                return `采集完成 · 发现 ${jobStatus.total_fetched} 篇，入库 ${jobStatus.total_new} 篇`;
              })()}
              {jobStatus.status === "partial_complete" && (() => {
                return `部分完成 · 发现 ${jobStatus.total_fetched} 篇，入库 ${jobStatus.total_new} 篇 (部分批次失败)`;
              })()}
              {jobStatus.status === "failed" && `任务失败: ${jobStatus.error_message ?? "未知错误"}`}
              {jobStatus.status === "timeout" && "任务超时: 部分批次未在时限内完成"}
            </div>

            {/* Completed stats */}
            {(jobStatus.status === "completed" || jobStatus.status === "partial_complete") && crawlStats && (
              <div className="text-xs text-[#7F8A93] space-y-1 mt-1">
                <p>共发现 {crawlStats.totalFetched} 篇，入库 {crawlStats.totalInserted} 篇，
                过滤 {crawlStats.totalFetched - crawlStats.totalInserted} 篇</p>
                {crawlStats.filterBreakdown && Object.values(crawlStats.filterBreakdown).every((c) => c === 0) && (
                  <p>所有文章通过检查</p>
                )}
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
