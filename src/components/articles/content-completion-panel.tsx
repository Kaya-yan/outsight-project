"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMediaStrategy, MEDIA_STRATEGY_LABEL, type MediaStrategy } from "@/lib/media-strategy";
import { MEDIA_OUTLETS } from "@/lib/constants";
import type { FullTextStatus } from "@/types/database";

interface CompletionStats {
  total: number;
  byStatus: Record<string, number>;
  byMedia: Record<string, Record<string, number>>;
  fetchable: number;
}

interface ContentCompletionPanelProps {
  onComplete?: () => void;
}

const STATUS_LABELS: Record<FullTextStatus, string> = {
  missing: "缺失",
  partial: "部分",
  complete: "完整",
  manual_uploaded: "手动上传",
  paywalled: "付费墙",
};

const STATUS_COLORS: Record<FullTextStatus, string> = {
  missing: "#ef4444",
  partial: "#f59e0b",
  complete: "#10b981",
  manual_uploaded: "#6366f1",
  paywalled: "#f43f5e",
};

export function ContentCompletionPanel({ onComplete }: ContentCompletionPanelProps) {
  const [stats, setStats] = useState<CompletionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [paused, setPaused] = useState(false);

  // Batch cleaning state
  const [cleaning, setCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState({ cleaned: 0, skipped: 0, total: 0 });
  const [cleanSource, setCleanSource] = useState<string>("");
  const cleanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/articles/completion-stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("[CompletionPanel] Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const startFetchAll = useCallback(async () => {
    if (!stats || stats.fetchable === 0) return;

    setFetching(true);
    setPaused(false);
    setProgress({ done: 0, total: stats.fetchable });

    try {
      // Fetch articles that need full text
      const res = await fetch("/api/articles/completion-stats");
      if (!res.ok) return;
      const data = await res.json();

      // Get fetchable article IDs
      const articlesRes = await fetch("/api/articles?pageSize=1000&fullTextStatus=missing,partial");
      if (!articlesRes.ok) return;
      const articlesData = await articlesRes.json();

      const fetchableArticles = (articlesData.data || []).filter(
        (a: { url?: string; full_text_status?: string }) =>
          a.url && (a.full_text_status === "missing" || a.full_text_status === "partial" || !a.full_text_status)
      );

      setProgress({ done: 0, total: fetchableArticles.length });

      let done = 0;
      for (const article of fetchableArticles) {
        if (paused) break;

        try {
          await fetch("/api/articles/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ articleId: article.id }),
          });
        } catch (err) {
          console.error(`[CompletionPanel] Failed to extract article ${article.id}:`, err);
        }

        done++;
        setProgress({ done, total: fetchableArticles.length });

        // 2-second interval to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Refresh stats after completion
      await fetchStats();
      onComplete?.();
    } catch (err) {
      console.error("[CompletionPanel] Batch fetch failed:", err);
    } finally {
      setFetching(false);
    }
  }, [stats, paused, fetchStats, onComplete]);

  const pauseFetch = useCallback(() => {
    setPaused(true);
  }, []);

  // ── Batch cleaning ──
  const runCleanBatch = useCallback(async (source: string) => {
    const params = new URLSearchParams({ limit: "50" });
    if (source) params.set("source", source);

    try {
      const res = await fetch(`/api/articles/batch-clean?${params}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error("[CompletionPanel] Clean batch failed:", err);
      return null;
    }
  }, []);

  const startCleaning = useCallback(async () => {
    setCleaning(true);
    setCleanProgress({ cleaned: 0, skipped: 0, total: 0 });

    // First batch
    const result = await runCleanBatch(cleanSource);
    if (!result) {
      setCleaning(false);
      return;
    }

    setCleanProgress({
      cleaned: result.cleaned,
      skipped: result.skipped,
      total: result.cleaned + result.skipped,
    });

    if (result.done) {
      setCleaning(false);
      await fetchStats();
      onComplete?.();
      return;
    }

    // Poll every 2s for remaining batches
    cleanTimerRef.current = setInterval(async () => {
      const batch = await runCleanBatch(cleanSource);
      if (!batch) return;

      setCleanProgress((prev) => ({
        cleaned: prev.cleaned + batch.cleaned,
        skipped: prev.skipped + batch.skipped,
        total: prev.total + batch.cleaned + batch.skipped,
      }));

      if (batch.done) {
        if (cleanTimerRef.current) clearInterval(cleanTimerRef.current);
        cleanTimerRef.current = null;
        setCleaning(false);
        await fetchStats();
        onComplete?.();
      }
    }, 2000);
  }, [cleanSource, runCleanBatch, fetchStats, onComplete]);

  const stopCleaning = useCallback(() => {
    if (cleanTimerRef.current) {
      clearInterval(cleanTimerRef.current);
      cleanTimerRef.current = null;
    }
    setCleaning(false);
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (cleanTimerRef.current) clearInterval(cleanTimerRef.current);
    };
  }, []);

  if (loading && !stats) {
    return (
      <Card className="border-[#E2E5E9]">
        <CardContent className="p-4">
          <div className="text-sm text-[#7F8A93]">加载全文完成度统计...</div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const completionRate = stats.total > 0
    ? Math.round(((stats.byStatus.complete || 0) + (stats.byStatus.manual_uploaded || 0)) / stats.total * 100)
    : 0;

  // Media stats table
  const mediaStats = MEDIA_OUTLETS.map((m) => {
    const mediaData = stats.byMedia[m.value] || {};
    const total = Object.values(mediaData).reduce((s, v) => s + v, 0);
    const complete = (mediaData.complete || 0) + (mediaData.manual_uploaded || 0);
    const missing = mediaData.missing || 0;
    const partial = mediaData.partial || 0;
    const paywalled = mediaData.paywalled || 0;
    const strategy = getMediaStrategy(m.value);

    return {
      media: m.value,
      label: m.label,
      total,
      complete,
      missing,
      partial,
      paywalled,
      strategy,
      rate: total > 0 ? Math.round(complete / total * 100) : 0,
    };
  });

  return (
    <Card className="border-[#E2E5E9]">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-[#2D3436]">全文补完</h3>
            <span className="text-xs text-[#7F8A93]">
              {stats.total} 篇语料 · {stats.fetchable} 篇可抓取
            </span>
          </div>
          <div className="flex items-center gap-2">
            {fetching ? (
              <Button
                onClick={pauseFetch}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
              >
                暂停
              </Button>
            ) : (
              <Button
                onClick={startFetchAll}
                disabled={stats.fetchable === 0}
                size="sm"
                className="h-8 text-xs bg-[#4A90A4] hover:bg-[#3D7D8F] text-white"
              >
                {progress.done > 0 && progress.done < progress.total
                  ? `继续抓取 (${progress.done}/${progress.total})`
                  : "一键抓取全文"}
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {fetching && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#7F8A93]">
              <span>抓取进度</span>
              <span>{progress.done}/{progress.total}</span>
            </div>
            <div className="h-2 bg-[#E2E5E9] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4A90A4] transition-all duration-300"
                style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Overall progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[#7F8A93]">
            <span>整体完成度</span>
            <span>{completionRate}%</span>
          </div>
          <div className="h-2 bg-[#E2E5E9] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#10b981] transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Status summary */}
        <div className="flex flex-wrap gap-3">
          {(Object.entries(stats.byStatus) as [FullTextStatus, number][]).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status] || "#7F8A93" }}
              />
              <span className="text-xs text-[#7F8A93]">
                {STATUS_LABELS[status] || status}: {count}
              </span>
            </div>
          ))}
        </div>

        {/* Media stats table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E2E5E9]">
                <th className="text-left py-2 pr-3 text-[#7F8A93] font-medium">媒体</th>
                <th className="text-left py-2 pr-3 text-[#7F8A93] font-medium">策略</th>
                <th className="text-right py-2 pr-3 text-[#7F8A93] font-medium">总数</th>
                <th className="text-right py-2 pr-3 text-[#7F8A93] font-medium">完整</th>
                <th className="text-right py-2 pr-3 text-[#7F8A93] font-medium">缺失</th>
                <th className="text-right py-2 pr-3 text-[#7F8A93] font-medium">付费墙</th>
                <th className="text-right py-2 text-[#7F8A93] font-medium">完成率</th>
              </tr>
            </thead>
            <tbody>
              {mediaStats.map((row) => (
                <tr key={row.media} className="border-b border-[#E2E5E9]/50 last:border-0">
                  <td className="py-2 pr-3 text-[#2D3436] font-medium">{row.media}</td>
                  <td className="py-2 pr-3">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${
                      row.strategy === "open"
                        ? "bg-[#10b981]/10 text-[#10b981]"
                        : row.strategy === "soft_paywall"
                        ? "bg-[#f59e0b]/10 text-[#f59e0b]"
                        : "bg-[#ef4444]/10 text-[#ef4444]"
                    }`}>
                      {MEDIA_STRATEGY_LABEL[row.strategy]}
                    </span>
                  </td>
                  <td className="text-right py-2 pr-3 text-[#7F8A93]">{row.total}</td>
                  <td className="text-right py-2 pr-3 text-[#10b981]">{row.complete}</td>
                  <td className="text-right py-2 pr-3 text-[#ef4444]">{row.missing}</td>
                  <td className="text-right py-2 pr-3 text-[#f43f5e]">{row.paywalled}</td>
                  <td className="text-right py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-12 h-1.5 bg-[#E2E5E9] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#10b981] rounded-full"
                          style={{ width: `${row.rate}%` }}
                        />
                      </div>
                      <span className="text-[#7F8A93] w-8 text-right">{row.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Batch cleaning section */}
        <div className="border-t border-[#E2E5E9] pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#2D3436]">全文清洗</h3>
            <div className="flex items-center gap-2">
              <select
                value={cleanSource}
                onChange={(e) => setCleanSource(e.target.value)}
                disabled={cleaning}
                className="h-8 rounded-md border border-[#E2E5E9] bg-white px-2 text-xs"
              >
                <option value="">全部媒体</option>
                {MEDIA_OUTLETS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              {cleaning ? (
                <Button
                  onClick={stopCleaning}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  停止
                </Button>
              ) : (
                <Button
                  onClick={startCleaning}
                  size="sm"
                  className="h-8 text-xs bg-[#6366f1] hover:bg-[#5558e6] text-white"
                >
                  清洗已有全文
                </Button>
              )}
            </div>
          </div>

          {cleaning && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[#7F8A93]">
                <span>清洗进度</span>
                <span>已清洗 {cleanProgress.cleaned} 篇 · 跳过 {cleanProgress.skipped} 篇</span>
              </div>
              <div className="h-2 bg-[#E2E5E9] rounded-full overflow-hidden">
                <div className="h-full bg-[#6366f1] transition-all duration-300 animate-pulse" style={{ width: "100%" }} />
              </div>
              <div className="text-[10px] text-[#7F8A93]">每批次处理 50 篇，2 秒间隔，字数下降超 80% 的文章会标记为待审阅</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
