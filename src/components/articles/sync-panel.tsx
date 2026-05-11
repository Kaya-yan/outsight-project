"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { RESEARCH_PERIODS } from "@/lib/constants";

interface SyncStatus {
  lastSync: string | null;
  hoursAgo: number | null;
  suggested: boolean;
  lastResult?: {
    fetched: number;
    new: number;
    status: string;
  };
  message: string;
}

interface SourceResult {
  name: string;
  fetched: number;
  inserted: number;
}

interface SyncResult {
  fetched: number;
  new: number;
  duplicates: number;
  period?: string | null;
  sources?: SourceResult[];
  gdeltDebug?: Record<string, number>;
  message: string;
}

interface SyncPanelProps {
  onSyncComplete?: () => void;
}

export function SyncPanel({ onSyncComplete }: SyncPanelProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sync/status");
      if (res.ok) {
        const json = await res.json();
        setStatus(json);
      }
    } catch {
      // Silently fail — status is non-critical
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSync = useCallback(async () => {
    if (!selectedPeriod) {
      setError("请先选择研究时段");
      return;
    }
    setIsSyncing(true);
    setError(null);
    setLastResult(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: selectedPeriod }),
      });
      const json = await res.json();
      if (res.ok) {
        setLastResult(json);
        fetchStatus();
        onSyncComplete?.();
      } else {
        setError(json.error ?? "同步失败");
      }
    } catch {
      setError("网络连接失败");
    } finally {
      setIsSyncing(false);
    }
  }, [selectedPeriod, fetchStatus, onSyncComplete]);

  const formatTimeAgo = (hours: number): string => {
    if (hours < 1) return "不到 1 小时前";
    if (hours < 24) return `${Math.round(hours)} 小时前`;
    return `${Math.round(hours / 24)} 天前`;
  };

  const periodLabel = RESEARCH_PERIODS.find((p) => p.value === selectedPeriod)?.label;

  return (
    <Card className="border-[#E2E5E9] shadow-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Status indicator */}
          <div className="flex items-center gap-3">
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 text-[#4A90A4] animate-spin" />
                <span className="text-sm text-[#4A90A4]">
                  正在同步{periodLabel ? ` (${periodLabel})` : ""}...
                </span>
              </>
            ) : (
              <>
                {status?.suggested ? (
                  <AlertCircle className="h-4 w-4 text-[#E67E22]" />
                ) : status?.lastSync ? (
                  <CheckCircle2 className="h-4 w-4 text-[#5DAD93]" />
                ) : (
                  <Clock className="h-4 w-4 text-[#7F8A93]" />
                )}
                <div>
                  <span className="text-sm text-[#2D3436]">
                    {status?.lastSync
                      ? `上次同步：${formatTimeAgo(status.hoursAgo!)}`
                      : "尚未同步"}
                  </span>
                  {status?.lastResult && (
                    <span className="text-xs text-[#7F8A93] ml-2">
                      (拉取 {status.lastResult.fetched} 篇，新增 {status.lastResult.new} 篇)
                    </span>
                  )}
                  {status?.suggested && (
                    <span className="text-xs text-[#E67E22] ml-2">
                      建议执行同步
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Period selector + Action button */}
          <div className="flex items-center gap-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              disabled={isSyncing}
              className="h-8 rounded-md border border-[#E2E5E9] bg-white px-2.5 text-xs text-[#2D3436] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4] disabled:opacity-50"
            >
              <option value="">选择时段</option>
              {RESEARCH_PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <Button
              onClick={handleSync}
              disabled={isSyncing || !selectedPeriod}
              variant="outline"
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "同步中..." : "执行同步"}
            </Button>
          </div>
        </div>

        {/* Sync result feedback */}
        {lastResult && (
          <div className="mt-3 rounded-md bg-[#5DAD93]/5 px-3 py-2 space-y-1">
            <p className="text-sm text-[#5DAD93]">{lastResult.message}</p>
            {lastResult.period && (
              <p className="text-xs text-[#7F8A93]">
                时段：{RESEARCH_PERIODS.find((p) => p.value === lastResult.period)?.label ?? lastResult.period}
              </p>
            )}
            {lastResult.sources && lastResult.sources.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#7F8A93]">
                {lastResult.sources.map((s) => (
                  <span key={s.name}>
                    {s.name}: 拉取 {s.fetched} · 新增 {s.inserted}
                  </span>
                ))}
              </div>
            )}
            {lastResult.fetched === 0 && (
              <p className="text-xs text-[#E67E22] mt-1">
                该时段未发现新语料。请尝试其他时段，或通过校园网数据库（ProQuest/EBSCO）检索后使用「批量上传」导入 CSV
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
