"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, CheckCircle2, XCircle, Clock, Play } from "lucide-react";

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

export function SyncPanel({ onSyncComplete }: SyncPanelProps) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
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

    try {
      const res = await fetch("/api/crawl/start", { method: "POST" });
      const json = await res.json();

      if (res.ok && json.job_id) {
        setJobStatus({
          job_id: json.job_id,
          status: "pending",
          progress: 0,
          total_fetched: 0,
          total_new: 0,
          error_message: null,
        });
        startPolling(json.job_id);
      } else {
        setError(json.error ?? "任务创建失败");
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
                : "BBC · 2024H2 · 仅元数据"}
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
                创建任务...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                开始搜索
              </>
            )}
          </Button>
        </div>

        {/* Progress bar + details (shown when job is active) */}
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
                {jobStatus.status === "pending" && "任务已启动，等待执行..."}
                {jobStatus.status === "running" && `正在采集... 已发现 ${jobStatus.total_fetched} 篇`}
                {jobStatus.status === "completed" && `采集完成 · 共发现 ${jobStatus.total_fetched} 篇，新增 ${jobStatus.total_new} 篇`}
                {jobStatus.status === "failed" && `任务失败: ${jobStatus.error_message ?? "未知错误"}`}
              </span>
              {isRunning && (
                <span className="text-[#95A5A6]">每 3 秒刷新</span>
              )}
            </div>

            {/* Show job_id for debugging */}
            {isRunning && (
              <p className="text-xs text-[#95A5A6] font-mono">
                Job: {jobStatus.job_id}
              </p>
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
