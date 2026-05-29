"use client";

import { useEffect, useRef } from "react";
import { useDomesticStore } from "@/stores/domestic-store";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ── SVG Word Cloud ──

function WordCloud({ words }: { words: { word: string; count: number }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (words.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据</span>;

  const maxCount = words[0]?.count ?? 1;
  const minCount = words[words.length - 1]?.count ?? 1;

  // Generate positions using spiral placement
  const placed: { word: string; x: number; y: number; size: number; color: string }[] = [];
  const colors = ["#4A90A4", "#6C5CE7", "#00B894", "#E17055", "#FDCB6E", "#E84393", "#00CEC9", "#A29BFE"];

  // Simple spiral placement
  const cx = 300, cy = 150;
  let angle = 0, radius = 0;

  for (const w of words.slice(0, 40)) {
    const ratio = minCount === maxCount ? 0.5 : (w.count - minCount) / (maxCount - minCount);
    const fontSize = 10 + ratio * 20;
    const textWidth = w.word.length * fontSize * 0.6;

    // Spiral outward until no collision
    let x = cx + radius * Math.cos(angle);
    let y = cy + radius * Math.sin(angle);

    // Check collision with placed words (simple bounding box)
    let attempts = 0;
    while (attempts < 100) {
      let collides = false;
      for (const p of placed) {
        const dx = Math.abs(x - p.x);
        const dy = Math.abs(y - p.y);
        if (dx < (textWidth + p.word.length * p.size * 0.6) / 2 + 4 &&
            dy < (fontSize + p.size) / 2 + 2) {
          collides = true;
          break;
        }
      }
      if (!collides) break;
      angle += 0.3;
      radius += 2;
      x = cx + radius * Math.cos(angle);
      y = cy + radius * Math.sin(angle);
      attempts++;
    }

    placed.push({
      word: w.word,
      x, y, size: fontSize,
      color: colors[placed.length % colors.length],
    });

    angle += 0.8;
    radius += 3;
  }

  return (
    <div ref={containerRef} className="relative w-full h-[300px] overflow-hidden">
      <svg width="600" height="300" viewBox="0 0 600 300" className="w-full h-full">
        {placed.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={p.y}
            fontSize={p.size}
            fill={p.color}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            {p.word}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── Simple Bar Chart ──

function BarChart({ data, labelKey, valueKey, color }: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  color?: string;
}) {
  if (data.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据</span>;
  const max = Math.max(...data.map((d) => d[valueKey] as number), 1);
  return (
    <div className="space-y-1">
      {data.slice(0, 12).map((d, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-[10px] text-[#7F8A93] w-16 truncate shrink-0">{d[labelKey] as string}</span>
          <div className="flex-1 bg-[#E2E5E9] rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${((d[valueKey] as number) / max) * 100}%`, backgroundColor: color ?? "#4A90A4" }}
            />
          </div>
          <span className="text-[10px] text-[#95A5A6] w-8 text-right">{d[valueKey] as number}</span>
        </div>
      ))}
    </div>
  );
}

// ── Simple Pie Chart (CSS) ──

function PieChart({ data }: { data: { polarity: string; count: number }[] }) {
  if (data.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据</span>;
  const total = data.reduce((s, d) => s + d.count, 0);
  const colors: Record<string, string> = { positive: "#00B894", neutral: "#636E72", negative: "#E17055" };
  const labels: Record<string, string> = { positive: "正面", neutral: "中性", negative: "负面" };

  let cumulative = 0;
  const gradientParts = data.map((d) => {
    const start = cumulative;
    cumulative += (d.count / total) * 360;
    return `${colors[d.polarity] ?? "#636E72"} ${start}deg ${cumulative}deg`;
  });

  return (
    <div className="flex items-center gap-4">
      <div
        className="w-20 h-20 rounded-full shrink-0"
        style={{ background: `conic-gradient(${gradientParts.join(", ")})` }}
      />
      <div className="space-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[d.polarity] ?? "#636E72" }} />
            <span className="text-[#2D3436]">{labels[d.polarity] ?? d.polarity}</span>
            <span className="text-[#95A5A6]">{d.count} ({((d.count / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Date Line Chart (SVG) ──

function DateLineChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据</span>;
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 500, h = 120, pad = 30;
  const xStep = (w - pad * 2) / Math.max(data.length - 1, 1);
  const yScale = (h - pad * 2) / max;

  const points = data.map((d, i) => ({
    x: pad + i * xStep,
    y: h - pad - d.count * yScale,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <line
          key={ratio}
          x1={pad} y1={h - pad - ratio * (h - pad * 2)}
          x2={w - pad} y2={h - pad - ratio * (h - pad * 2)}
          stroke="#2D3436" strokeWidth={1}
        />
      ))}
      {/* Line */}
      <path d={pathD} fill="none" stroke="#4A90A4" strokeWidth={2} />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#4A90A4" />
      ))}
      {/* X labels (every Nth) */}
      {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0).map((d, i) => {
        const idx = data.indexOf(d);
        return (
          <text key={i} x={pad + idx * xStep} y={h - 5} textAnchor="middle" fontSize={9} fill="#636E72">
            {d.date.slice(5)}
          </text>
        );
      })}
    </svg>
  );
}

// ── Main Dashboard ──

export function AnalysisDashboard() {
  const { stats, isLoadingStats, fetchStats } = useDomesticStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoadingStats) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-[#E2E5E9]">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-3 bg-[#E2E5E9]" />
              <Skeleton className="h-32 w-full bg-[#E2E5E9]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "总文章数", value: stats.totalArticles },
          { label: "媒体源数", value: stats.mediaDistribution.length },
          { label: "平均字数", value: stats.avgWordCount },
          { label: "有AI分析", value: stats.sentimentDistribution.reduce((s, d) => s + d.count, 0) },
        ].map((item, i) => (
          <Card key={i} className="border-[#E2E5E9]">
            <CardContent className="p-3 text-center">
              <div className="text-lg font-bold text-[#4A90A4]">{item.value}</div>
              <div className="text-[10px] text-[#95A5A6]">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Word Cloud */}
        <Card className="border-[#E2E5E9] lg:col-span-2">
          <CardContent className="p-4">
            <h3 className="text-xs text-[#7F8A93] mb-2">高频词云</h3>
            <WordCloud words={stats.topWords} />
          </CardContent>
        </Card>

        {/* Media Distribution */}
        <Card className="border-[#E2E5E9]">
          <CardContent className="p-4">
            <h3 className="text-xs text-[#7F8A93] mb-3">媒体分布</h3>
            <BarChart data={stats.mediaDistribution as unknown as Record<string, unknown>[]} labelKey="media" valueKey="count" />
          </CardContent>
        </Card>

        {/* Sentiment Distribution */}
        <Card className="border-[#E2E5E9]">
          <CardContent className="p-4">
            <h3 className="text-xs text-[#7F8A93] mb-3">情感分布</h3>
            <PieChart data={stats.sentimentDistribution} />
          </CardContent>
        </Card>

        {/* Date Distribution */}
        <Card className="border-[#E2E5E9] lg:col-span-2">
          <CardContent className="p-4">
            <h3 className="text-xs text-[#7F8A93] mb-3">日期分布</h3>
            <DateLineChart data={stats.dateDistribution} />
          </CardContent>
        </Card>

        {/* Top Words Bar */}
        <Card className="border-[#E2E5E9] lg:col-span-2">
          <CardContent className="p-4">
            <h3 className="text-xs text-[#7F8A93] mb-3">高频词 Top 20</h3>
            <BarChart data={stats.topWords.slice(0, 20) as unknown as Record<string, unknown>[]} labelKey="word" valueKey="count" color="#6C5CE7" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
