"use client";

import { useEffect, useState, useRef } from "react";
import cloud from "d3-cloud";
import { useDomesticStore } from "@/stores/domestic-store";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Info } from "lucide-react";

// ── D3-Cloud Word Cloud ──

interface CloudWord {
  text: string;
  size: number;
  count: number;
  x?: number;
  y?: number;
  rotate?: number;
}

const WC_COLORS = ["#1B4D5C", "#2D6A7A", "#3A7D8F", "#4A90A4", "#5DA3B5", "#6BA8B8", "#8DC0CC"];

function WordCloud({ words }: { words: { word: string; count: number }[] }) {
  const [placed, setPlaced] = useState<CloudWord[]>([]);
  const [dims, setDims] = useState({ w: 600, h: 300 });
  const containerRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (words.length === 0) return;

    const max = words[0]?.count ?? 1;
    const min = words[Math.min(words.length - 1, 39)]?.count ?? 1;
    const containerWidth = containerRef.current?.clientWidth ?? 600;
    const w = Math.max(400, containerWidth);
    const h = Math.max(200, Math.round(w * 0.45));

    const cloudWords: CloudWord[] = words.slice(0, 45).map((d) => ({
      text: d.word,
      count: d.count,
      size: min === max ? 18 : 10 + ((d.count - min) / (max - min)) * 30,
    }));

    cancelledRef.current = false;

    cloud()
      .size([w, h])
      .words(cloudWords)
      .padding(3)
      .rotate(() => (Math.random() > 0.7 ? (Math.random() > 0.5 ? 90 : -90) : 0))
      .font("system-ui, -apple-system, sans-serif")
      .fontSize((d) => (d as CloudWord).size)
      .spiral("archimedean")
      .on("end", (output) => {
        if (!cancelledRef.current) {
          setPlaced(output as CloudWord[]);
          setDims({ w, h });
        }
      })
      .start();

    return () => { cancelledRef.current = true; };
  }, [words]);

  if (words.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据</span>;
  if (placed.length === 0) {
    return (
      <div ref={containerRef} className="w-full h-[280px] flex items-center justify-center">
        <div className="h-4 w-4 border-2 border-[#E2E5E9] border-t-[#4A90A4] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <svg width={dims.w} height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`} className="w-full h-auto" role="img" aria-label="高频词云">
        <g transform={`translate(${dims.w / 2},${dims.h / 2})`}>
          {placed.map((w, i) => (
            <text
              key={w.text}
              x={w.x}
              y={w.y}
              fontSize={w.size}
              fill={WC_COLORS[i % WC_COLORS.length]}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${w.rotate ?? 0})`}
              className="cursor-default hover:opacity-60 transition-opacity duration-150"
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontWeight: w.size > 24 ? 700 : w.size > 16 ? 600 : 400,
              }}
            >
              <title>{w.text}: {w.count}次</title>
              {w.text}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

// ── Horizontal Bar Chart with gradient ──

function BarChart({ data, labelKey, valueKey, color, maxItems = 12 }: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  color?: string;
  maxItems?: number;
}) {
  if (data.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据</span>;
  const sliced = data.slice(0, maxItems);
  const max = Math.max(...sliced.map((d) => d[valueKey] as number), 1);
  const baseColor = color ?? "#4A90A4";

  return (
    <div className="space-y-1.5">
      {sliced.map((d, i) => {
        const pct = ((d[valueKey] as number) / max) * 100;
        return (
          <div key={i} className="group flex items-center gap-2">
            <span className="text-[10px] text-[#7F8A93] w-16 truncate shrink-0 text-right">{d[labelKey] as string}</span>
            <div className="flex-1 bg-[#F0F2F5] rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 group-hover:brightness-110"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${baseColor}dd, ${baseColor})`,
                  minWidth: pct > 0 ? "4px" : "0",
                }}
              />
            </div>
            <span className="text-[10px] text-[#636E72] w-8 text-right font-medium tabular-nums">{d[valueKey] as number}</span>
          </div>
        );
      })}
      {data.length > maxItems && (
        <p className="text-[9px] text-[#BDC3C7] text-right">+{data.length - maxItems} more</p>
      )}
    </div>
  );
}

// ── Donut Chart ──

function DonutChart({ data }: { data: { polarity: string; count: number }[] }) {
  if (data.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据</span>;
  const total = data.reduce((s, d) => s + d.count, 0);
  const colors: Record<string, string> = { positive: "#00B894", neutral: "#636E72", negative: "#E17055" };
  const labels: Record<string, string> = { positive: "正面", neutral: "中性", negative: "负面" };

  const size = 100;
  const cx = size / 2, cy = size / 2;
  const r = 38, innerR = 24;

  let cumulative = 0;
  const segments = data.map((d) => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += d.count;
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(startAngle);
    const iy1 = cy + innerR * Math.sin(startAngle);
    const ix2 = cx + innerR * Math.cos(endAngle);
    const iy2 = cy + innerR * Math.sin(endAngle);

    const largeArc = d.count / total > 0.5 ? 1 : 0;
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;

    return { path, color: colors[d.polarity] ?? "#636E72", ...d };
  });

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label="情感极性分布">
        {segments.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} className="hover:opacity-80 transition-opacity cursor-pointer">
            <title>{labels[s.polarity] ?? s.polarity}: {s.count} ({((s.count / total) * 100).toFixed(0)}%)</title>
          </path>
        ))}
        <text x={cx} y={cy - 3} textAnchor="middle" fontSize="14" fontWeight="600" fill="#2D3436">{total}</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7" fill="#95A5A6">total</text>
      </svg>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors[d.polarity] ?? "#636E72" }} />
            <span className="text-[#2D3436] w-8">{labels[d.polarity] ?? d.polarity}</span>
            <span className="text-[#95A5A6] tabular-nums">{d.count}</span>
            <span className="text-[#BDC3C7]">({((d.count / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Area Line Chart ──

function DateLineChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据</span>;
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 500, h = 140, pad = 30;
  const xStep = (w - pad * 2) / Math.max(data.length - 1, 1);
  const yScale = (h - pad * 2) / max;

  const points = data.map((d, i) => ({
    x: pad + i * xStep,
    y: h - pad - d.count * yScale,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  return (
    <div className="relative">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="采集日期分布">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line key={ratio} x1={pad} y1={h - pad - ratio * (h - pad * 2)} x2={w - pad} y2={h - pad - ratio * (h - pad * 2)} stroke="#E2E5E9" strokeWidth={1} />
        ))}
        {/* Area fill */}
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4A90A4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#4A90A4" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGrad)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="#4A90A4" strokeWidth={2} strokeLinejoin="round" />
        {/* Dots + hover zones */}
        {points.map((p, i) => (
          <g key={i}>
            <rect
              x={p.x - xStep / 2}
              y={0}
              width={xStep}
              height={h}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              className="cursor-crosshair"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIdx === i ? 4 : 2.5}
              fill={hoverIdx === i ? "#2D6A7A" : "#4A90A4"}
              className="transition-all"
            />
          </g>
        ))}
        {/* X labels */}
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0).map((d, i) => {
          const idx = data.indexOf(d);
          return (
            <text key={i} x={pad + idx * xStep} y={h - 8} textAnchor="middle" fontSize={9} fill="#95A5A6">
              {d.date.slice(5)}
            </text>
          );
        })}
      </svg>
      {/* Tooltip */}
      {hoverIdx !== null && data[hoverIdx] && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-white border border-[#E2E5E9] rounded shadow-sm px-2 py-1 text-[10px] pointer-events-none z-10">
          <span className="text-[#7F8A93]">{data[hoverIdx].date}</span>
          <span className="text-[#2D3436] font-medium ml-1">{data[hoverIdx].count} 篇</span>
        </div>
      )}
    </div>
  );
}

// ── Metric Card with tooltip ──

function MetricTooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <span
        className="cursor-help text-[#95A5A6] hover:text-[#7F8A93]"
        tabIndex={0}
        role="button"
        aria-label={text}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
      >
        <Info className="h-3 w-3" />
      </span>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[10px] leading-4 text-[#2D3436] bg-white border border-[#E2E5E9] rounded shadow-md w-56 z-50 whitespace-normal" role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}

// ── Character Treemap ──

function CharTreemap({ chars }: { chars: { char: string; count: number }[] }) {
  if (chars.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据</span>;
  const max = chars[0]?.count ?? 1;

  const colorStops = [
    { threshold: 0.85, bg: "#1B4D5C", fg: "#ffffff" },
    { threshold: 0.7, bg: "#2D6A7A", fg: "#ffffff" },
    { threshold: 0.55, bg: "#3A7D8F", fg: "#ffffff" },
    { threshold: 0.4, bg: "#4A90A4", fg: "#ffffff" },
    { threshold: 0.25, bg: "#7AB8C9", fg: "#ffffff" },
    { threshold: 0.15, bg: "#A8D4DD", fg: "#1B4D5C" },
    { threshold: 0, bg: "#D4EBF0", fg: "#2D6A7A" },
  ];

  return (
    <div className="flex flex-wrap gap-1">
      {chars.slice(0, 24).map((c) => {
        const ratio = c.count / max;
        const stop = colorStops.find((s) => ratio >= s.threshold)!;
        const size = ratio > 0.7 ? "w-14 h-14 text-xl"
          : ratio > 0.4 ? "w-12 h-12 text-lg"
          : ratio > 0.2 ? "w-10 h-10 text-base"
          : "w-9 h-9 text-sm";
        return (
          <span
            key={c.char}
            className={`inline-flex items-center justify-center rounded-lg cursor-default transition-all hover:scale-105 hover:shadow-md ${size}`}
            style={{ backgroundColor: stop.bg, color: stop.fg, fontFamily: "serif" }}
            title={`${c.char}: ${c.count}次 (${(ratio * 100).toFixed(0)}%)`}
          >
            {c.char}
          </span>
        );
      })}
    </div>
  );
}

// ── Bigram Network (simplified) ──

function BigramList({ bigrams }: { bigrams: { bigram: string; count: number }[] }) {
  if (bigrams.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据</span>;
  const max = bigrams[0]?.count ?? 1;

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
      {bigrams.slice(0, 20).map((b, i) => {
        const pct = (b.count / max) * 100;
        return (
          <div key={b.bigram} className="flex items-center gap-2">
            <span className="text-[10px] text-[#95A5A6] w-4 text-right">{i + 1}</span>
            <span className="text-xs font-mono text-[#2D3436] w-14 truncate">{b.bigram}</span>
            <div className="flex-1 bg-[#F0F2F5] rounded-full h-1.5 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#E17055] to-[#FDCB6E]" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[9px] text-[#95A5A6] w-5 text-right tabular-nums">{b.count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Summary Stat Card ──

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card className="border-[#E2E5E9] hover:shadow-sm transition-shadow">
      <CardContent className="p-3 text-center">
        <div className="text-lg font-bold tabular-nums" style={{ color: color ?? "#4A90A4" }}>{value}</div>
        <div className="text-[10px] text-[#7F8A93]">{label}</div>
        {sub && <div className="text-[9px] text-[#BDC3C7] mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

// ── Section Header ──

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-4 rounded-full bg-[#4A90A4]" />
      <h3 className="text-xs font-medium text-[#2D3436]">{title}</h3>
      {subtitle && <span className="text-[10px] text-[#95A5A6]">{subtitle}</span>}
    </div>
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
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-[#E2E5E9]">
              <CardContent className="p-3">
                <Skeleton className="h-5 w-16 mx-auto mb-1 bg-[#E2E5E9]" />
                <Skeleton className="h-3 w-12 mx-auto bg-[#E2E5E9]" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-[#E2E5E9]">
              <CardContent className="p-4">
                <Skeleton className="h-3 w-20 mb-3 bg-[#E2E5E9]" />
                <Skeleton className="h-28 w-full bg-[#E2E5E9]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const aiAnalyzedCount = stats.sentimentDistribution.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-5">
      {/* ── Row 1: Key Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="总文章数" value={stats.totalArticles} />
        <StatCard label="媒体源数" value={stats.mediaDistribution.length} />
        <StatCard label="平均字数" value={stats.avgWordCount.toLocaleString()} />
        <StatCard label="AI 分析数" value={aiAnalyzedCount} sub={stats.totalArticles > 0 ? `${((aiAnalyzedCount / stats.totalArticles) * 100).toFixed(0)}% coverage` : undefined} />
        <StatCard
          label="TTR 词汇多样性"
          value={`${(stats.ttr * 100).toFixed(1)}%`}
          sub="Type-Token Ratio"
          color="#6C5CE7"
        />
      </div>

      {/* ── Row 2: Lexical Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-[#E2E5E9]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#7F8A93]">
                <MetricTooltip text="STTR（Standardized TTR）= 以 1000 词为窗口滑动计算 TTR 后取均值。解决了 TTR 受文本长度影响的问题。">
                  <span>STTR</span>
                </MetricTooltip>
              </span>
              <span className="text-sm font-bold text-[#6C5CE7] tabular-nums">{(stats.sttr * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-[#F0F2F5] rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-[#6C5CE7]" style={{ width: `${stats.sttr * 100}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E2E5E9]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#7F8A93]">
                <MetricTooltip text="词汇密度（Lexical Density）= 实词数 / 总词数。密度越高表示信息承载量越大。">
                  <span>词汇密度</span>
                </MetricTooltip>
              </span>
              <span className="text-sm font-bold text-[#00B894] tabular-nums">{(stats.lexicalDensity * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-[#F0F2F5] rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-[#00B894]" style={{ width: `${Math.min(100, stats.lexicalDensity * 100)}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E2E5E9]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#7F8A93]">
                <MetricTooltip text="正面情感文章占已分析文章的百分比。">
                  <span>正面情感比</span>
                </MetricTooltip>
              </span>
              <span className="text-sm font-bold text-[#00B894] tabular-nums">
                {aiAnalyzedCount > 0
                  ? `${(((stats.sentimentDistribution.find((d) => d.polarity === "positive")?.count ?? 0) / aiAnalyzedCount) * 100).toFixed(0)}%`
                  : "N/A"}
              </span>
            </div>
            <div className="w-full bg-[#F0F2F5] rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-[#00B894]"
                style={{
                  width: aiAnalyzedCount > 0
                    ? `${((stats.sentimentDistribution.find((d) => d.polarity === "positive")?.count ?? 0) / aiAnalyzedCount) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E2E5E9]">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#7F8A93]">
                <MetricTooltip text="负面情感文章占已分析文章的百分比。">
                  <span>负面情感比</span>
                </MetricTooltip>
              </span>
              <span className="text-sm font-bold text-[#E17055] tabular-nums">
                {aiAnalyzedCount > 0
                  ? `${(((stats.sentimentDistribution.find((d) => d.polarity === "negative")?.count ?? 0) / aiAnalyzedCount) * 100).toFixed(0)}%`
                  : "N/A"}
              </span>
            </div>
            <div className="w-full bg-[#F0F2F5] rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-[#E17055]"
                style={{
                  width: aiAnalyzedCount > 0
                    ? `${((stats.sentimentDistribution.find((d) => d.polarity === "negative")?.count ?? 0) / aiAnalyzedCount) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Word Cloud (full width) ── */}
      <Card className="border-[#E2E5E9]">
        <CardContent className="p-4">
          <SectionTitle title="高频词云" subtitle={`Top ${stats.topWords.length} words`} />
          <WordCloud words={stats.topWords} />
        </CardContent>
      </Card>

      {/* ── Row 4: Date Distribution (full width) ── */}
      <Card className="border-[#E2E5E9]">
        <CardContent className="p-4">
          <SectionTitle title="采集日期分布" subtitle={`${stats.dateDistribution.length} days`} />
          <DateLineChart data={stats.dateDistribution} />
        </CardContent>
      </Card>

      {/* ── Row 5: Media + Sentiment side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-[#E2E5E9]">
          <CardContent className="p-4">
            <SectionTitle title="媒体来源分布" subtitle={`${stats.mediaDistribution.length} sources`} />
            <BarChart data={stats.mediaDistribution as unknown as Record<string, unknown>[]} labelKey="media" valueKey="count" maxItems={10} />
          </CardContent>
        </Card>

        <Card className="border-[#E2E5E9]">
          <CardContent className="p-4">
            <SectionTitle title="情感极性分布" subtitle={aiAnalyzedCount > 0 ? `${aiAnalyzedCount} analyzed` : "no data"} />
            <DonutChart data={stats.sentimentDistribution} />
          </CardContent>
        </Card>
      </div>

      {/* ── Row 6: Top Words + Character Heat Map ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="border-[#E2E5E9]">
          <CardContent className="p-4">
            <SectionTitle title="高频词 Top 20" subtitle="content words" />
            <BarChart data={stats.topWords.slice(0, 20) as unknown as Record<string, unknown>[]} labelKey="word" valueKey="count" color="#6C5CE7" maxItems={20} />
          </CardContent>
        </Card>

        <Card className="border-[#E2E5E9]">
          <CardContent className="p-4">
            <SectionTitle title="高频字方阵" subtitle={`Top ${stats.topChars?.length ?? 0} chars`} />
            <CharTreemap chars={stats.topChars ?? []} />
          </CardContent>
        </Card>
      </div>

      {/* ── Row 7: Bigrams ── */}
      <Card className="border-[#E2E5E9]">
        <CardContent className="p-4">
          <SectionTitle title="高频双字组合" subtitle={`Top ${stats.topBigrams?.length ?? 0} bigrams`} />
          <BigramList bigrams={stats.topBigrams ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
