"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FetchResult {
  date: string;
  count: number;
  articles: { title: string; url: string; date: string }[];
  error?: string;
  debug?: string[];
}

interface CollectResult {
  date: string;
  collected: number;
  skipped: number;
  failed: number;
  aiTriggered: number;
  total: number;
  results: { id: string; title: string; status: string }[];
}

interface WordFreq {
  word: string;
  count: number;
}

interface StatsResult {
  date: string;
  articleCount: number;
  totalChars: number;
  uniqueChars: number;
  avgSentenceLen: number;
  charFrequency: WordFreq[];
  wordFrequency: WordFreq[];
  sentences: number;
}

type Phase = "idle" | "fetching" | "collecting" | "analyzing" | "done" | "error";

export function PeopleDailyPanel() {
  const [expanded, setExpanded] = useState(false);
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [phase, setPhase] = useState<Phase>("idle");
  const [phaseLabel, setPhaseLabel] = useState("");
  const [error, setError] = useState("");
  const [fetchResult, setFetchResult] = useState<FetchResult | null>(null);
  const [collectResult, setCollectResult] = useState<CollectResult | null>(null);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const abortRef = useRef(false);

  const runPipeline = useCallback(async () => {
    abortRef.current = false;
    setError("");
    setFetchResult(null);
    setCollectResult(null);
    setStats(null);

    // Phase 1: Fetch article list
    setPhase("fetching");
    setPhaseLabel("正在获取文章列表...");

    try {
      const listRes = await fetch(`/api/people-daily/fetch-list?date=${date}`);
      const listData: FetchResult = await listRes.json();
      setFetchResult(listData);

      if (!listRes.ok) {
        setPhase("error");
        setError(listData.error || `HTTP ${listRes.status}`);
        return;
      }

      if (listData.count === 0) {
        setPhase("error");
        setError(listData.error || "未找到该日期的文章。可能原因：该日期无出版（周日）、页面结构变更、或日期超出数据范围。");
        return;
      }

      // Phase 2: Collect articles (batch of 5 at a time to avoid timeout)
      setPhase("collecting");
      setPhaseLabel(`正在采集 ${listData.count} 篇文章...`);
      setProgress({ current: 0, total: listData.count });

      const batchSize = 5;
      let totalCollected = 0;
      let totalSkipped = 0;
      let totalFailed = 0;
      const allResults: CollectResult["results"] = [];

      for (let i = 0; i < listData.articles.length; i += batchSize) {
        if (abortRef.current) break;

        const batch = listData.articles.slice(i, i + batchSize);
        setPhaseLabel(`正在采集 ${i + 1}-${Math.min(i + batchSize, listData.articles.length)}/${listData.count}...`);

        const collectRes = await fetch("/api/people-daily/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, articles: batch, runAi: false }),
        });

        if (collectRes.ok) {
          const batchResult: CollectResult = await collectRes.json();
          totalCollected += batchResult.collected;
          totalSkipped += batchResult.skipped;
          totalFailed += batchResult.failed;
          allResults.push(...batchResult.results);
        } else {
          totalFailed += batch.length;
        }

        setProgress({ current: Math.min(i + batchSize, listData.articles.length), total: listData.count });
      }

      setCollectResult({
        date,
        collected: totalCollected,
        skipped: totalSkipped,
        failed: totalFailed,
        aiTriggered: 0,
        total: listData.count,
        results: allResults,
      });

      // Phase 3: Fetch stats
      setPhase("analyzing");
      setPhaseLabel("正在分析字频词频...");

      const statsRes = await fetch(`/api/people-daily/stats?date=${date}`);
      if (statsRes.ok) {
        const statsData: StatsResult = await statsRes.json();
        setStats(statsData);
      }

      setPhase("done");
      setPhaseLabel("完成");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "未知错误");
    }
  }, [date]);

  const stop = useCallback(() => {
    abortRef.current = true;
    setPhase("idle");
    setPhaseLabel("");
  }, []);

  return (
    <Card className="border-[#E2E5E9]">
      <CardContent className="p-4">
        {/* Header - always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-[#2D3436]">中文语料测试区（人民日报）</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-[#ef4444]/10 text-[#ef4444] font-medium">
              测试
            </span>
          </div>
          <span className="text-[#7F8A93] text-xs">
            {expanded ? "▲ 收起" : "▼ 展开"}
          </span>
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">
            {/* Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#7F8A93] font-medium">日期</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={phase === "fetching" || phase === "collecting" || phase === "analyzing"}
                  className="h-8 rounded-md border border-[#E2E5E9] bg-white px-2 text-xs"
                />
              </div>
              {phase === "fetching" || phase === "collecting" || phase === "analyzing" ? (
                <Button onClick={stop} variant="outline" size="sm" className="h-8 text-xs">
                  停止
                </Button>
              ) : (
                <Button
                  onClick={runPipeline}
                  size="sm"
                  className="h-8 text-xs bg-[#ef4444] hover:bg-[#dc2626] text-white"
                >
                  采集并分析
                </Button>
              )}
            </div>

            {/* Progress */}
            {phase !== "idle" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-[#7F8A93]">
                  <span>{phaseLabel}</span>
                  {progress.total > 0 && (
                    <span>{progress.current}/{progress.total}</span>
                  )}
                </div>
                {progress.total > 0 && (
                  <div className="h-2 bg-[#E2E5E9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#ef4444] transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                )}
                {phase === "analyzing" && (
                  <div className="h-2 bg-[#E2E5E9] rounded-full overflow-hidden">
                    <div className="h-full bg-[#ef4444] transition-all duration-300 animate-pulse" style={{ width: "100%" }} />
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {phase === "error" && (
              <div className="space-y-2">
                <div className="text-xs text-[#ef4444] bg-[#ef4444]/5 p-3 rounded-lg border border-[#ef4444]/20">
                  {error}
                </div>
                {fetchResult?.debug && fetchResult.debug.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-[#7F8A93] hover:text-[#2D3436]">调试信息</summary>
                    <div className="mt-1 bg-[#f8f9fb] p-2 rounded border border-[#E2E5E9] font-mono text-[10px] leading-relaxed max-h-40 overflow-y-auto">
                      {fetchResult.debug.map((line, i) => (
                        <div key={i} className="text-[#475569]">{line}</div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Fetch result summary */}
            {fetchResult && (
              <div className="flex gap-4 text-xs">
                <span className="text-[#7F8A93]">发现 <strong className="text-[#2D3436]">{fetchResult.count}</strong> 篇文章</span>
              </div>
            )}

            {/* Collect result summary */}
            {collectResult && (
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="px-2 py-1 rounded bg-[#10b981]/10 text-[#10b981]">
                  入库 {collectResult.collected} 篇
                </span>
                {collectResult.skipped > 0 && (
                  <span className="px-2 py-1 rounded bg-[#f59e0b]/10 text-[#f59e0b]">
                    跳过 {collectResult.skipped} 篇（已存在）
                  </span>
                )}
                {collectResult.failed > 0 && (
                  <span className="px-2 py-1 rounded bg-[#ef4444]/10 text-[#ef4444]">
                    失败 {collectResult.failed} 篇
                  </span>
                )}
              </div>
            )}

            {/* Stats display */}
            {stats && stats.articleCount > 0 && (
              <div className="space-y-4">
                {/* Overview stats */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-[#f8f9fb] rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-[#2D3436]">{stats.articleCount}</div>
                    <div className="text-[10px] text-[#7F8A93]">文章数</div>
                  </div>
                  <div className="bg-[#f8f9fb] rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-[#2D3436]">{stats.totalChars.toLocaleString()}</div>
                    <div className="text-[10px] text-[#7F8A93]">总字数</div>
                  </div>
                  <div className="bg-[#f8f9fb] rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-[#2D3436]">{stats.uniqueChars.toLocaleString()}</div>
                    <div className="text-[10px] text-[#7F8A93]">独特字</div>
                  </div>
                  <div className="bg-[#f8f9fb] rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-[#2D3436]">{stats.avgSentenceLen}</div>
                    <div className="text-[10px] text-[#7F8A93]">平均句长</div>
                  </div>
                </div>

                {/* Two columns: char freq + word freq */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Character frequency */}
                  <div>
                    <h4 className="text-xs font-medium text-[#2D3436] mb-2">高频字 TOP 20</h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {stats.charFrequency.slice(0, 20).map((item, i) => (
                        <div key={item.word} className="flex items-center gap-2 text-xs">
                          <span className="w-5 text-right text-[#7F8A93]">{i + 1}</span>
                          <span className="w-6 font-medium text-[#2D3436]">{item.word}</span>
                          <div className="flex-1 h-4 bg-[#E2E5E9] rounded overflow-hidden">
                            <div
                              className="h-full bg-[#4A90A4] rounded"
                              style={{ width: `${(item.count / stats.charFrequency[0].count) * 100}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-[#7F8A93]">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Word frequency */}
                  <div>
                    <h4 className="text-xs font-medium text-[#2D3436] mb-2">高频词 TOP 20</h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {stats.wordFrequency.slice(0, 20).map((item, i) => (
                        <div key={item.word} className="flex items-center gap-2 text-xs">
                          <span className="w-5 text-right text-[#7F8A93]">{i + 1}</span>
                          <span className="w-16 font-medium text-[#2D3436] truncate">{item.word}</span>
                          <div className="flex-1 h-4 bg-[#E2E5E9] rounded overflow-hidden">
                            <div
                              className="h-full bg-[#6366f1] rounded"
                              style={{ width: `${(item.count / stats.wordFrequency[0].count) * 100}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-[#7F8A93]">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Word cloud */}
                <div>
                  <h4 className="text-xs font-medium text-[#2D3436] mb-2">词云</h4>
                  <div className="bg-[#f8f9fb] rounded-lg p-4 border border-[#E2E5E9]">
                    <WordCloud words={stats.wordFrequency.slice(0, 60)} />
                  </div>
                </div>
              </div>
            )}

            {/* No stats after done */}
            {phase === "done" && stats && stats.articleCount === 0 && (
              <div className="text-xs text-[#7F8A93]">未找到该日期的语料数据。</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Word Cloud SVG Component ──

function WordCloud({ words }: { words: WordFreq[] }) {
  if (!words.length) return <div className="text-xs text-[#7F8A93] text-center py-8">暂无数据</div>;

  const width = 560;
  const height = 280;
  const maxCount = words[0].count;
  const minCount = words[words.length - 1].count;

  const colors = [
    "#4A90A4", "#5DAD93", "#6366f1", "#E67E22", "#ef4444",
    "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899",
  ];

  // Calculate font sizes
  const sized = words.map((w) => {
    const ratio = minCount === maxCount ? 1 : (w.count - minCount) / (maxCount - minCount);
    return {
      ...w,
      fontSize: 12 + ratio * 30, // 12px to 42px
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  });

  // Simple spiral placement
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const cx = width / 2;
  const cy = height / 2;

  function estimateWidth(text: string, fontSize: number): number {
    // Chinese chars are roughly square, each ~fontSize wide
    return text.length * fontSize * 1.1;
  }

  function intersects(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
    return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
  }

  const positions: { x: number; y: number; fontSize: number; word: string; color: string }[] = [];

  for (const item of sized) {
    const w = estimateWidth(item.word, item.fontSize);
    const h = item.fontSize * 1.4;
    let found = false;

    // Spiral outward from center
    for (let r = 0; r < Math.max(width, height) / 2; r += 4) {
      for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
        const x = cx + r * Math.cos(angle) - w / 2;
        const y = cy + r * Math.sin(angle) - h / 2;
        const rect = { x, y, w, h };

        // Bounds check
        if (x < 2 || y < 2 || x + w > width - 2 || y + h > height - 2) continue;

        // Collision check
        if (placed.some((p) => intersects(p, rect))) continue;

        placed.push(rect);
        positions.push({ x: x + w / 2, y: y + h / 2, fontSize: item.fontSize, word: item.word, color: item.color });
        found = true;
        break;
      }
      if (found) break;
    }
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: "280px" }}>
      {positions.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={p.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={p.color}
          fontSize={p.fontSize}
          fontFamily="'Noto Sans SC', 'Inter', sans-serif"
          fontWeight={p.fontSize > 28 ? 700 : 500}
          style={{ cursor: "default" }}
        >
          {p.word}
        </text>
      ))}
    </svg>
  );
}
