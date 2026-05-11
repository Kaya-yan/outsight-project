"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FrameworkPie } from "@/components/analytics/framework-pie";
import { TimelineChart } from "@/components/analytics/timeline-chart";
import { MediaHeatmap } from "@/components/analytics/media-heatmap";
import { CoderStats } from "@/components/analytics/coder-stats";
import { KappaChart } from "@/components/analytics/kappa-chart";
import { BarChart3 } from "lucide-react";

interface AnalyticsData {
  frameworkDistribution: Record<string, number>;
  mediaPeriod: Record<string, Record<string, number>>;
  coderWorkload: Record<string, number>;
  kappaValues: number[];
  totalAnnotations: number;
  totalArticles: number;
  totalRounds: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
        }
      } catch {
        // Silent
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <h1 className="text-xl font-semibold text-[#2D3436]">统计分析</h1>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-[#4A90A4]" />
        <h1 className="text-xl font-semibold text-[#2D3436]">统计分析</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "总标注数", value: data?.totalAnnotations ?? 0, color: "#4A90A4" },
          { label: "入库语料", value: data?.totalArticles ?? 0, color: "#5DAD93" },
          { label: "双编码轮次", value: data?.totalRounds ?? 0, color: "#2D3436" },
        ].map((card) => (
          <Card key={card.label} className="border-[#E2E5E9] shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-mono font-semibold" style={{ color: card.color }}>
                {card.value}
              </p>
              <p className="text-xs text-[#7F8A93] mt-1">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Framework Distribution */}
      <Card className="border-[#E2E5E9] shadow-card">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium text-[#2D3436] mb-3">框架分布</h3>
          <FrameworkPie data={data?.frameworkDistribution ?? {}} />
        </CardContent>
      </Card>

      {/* Media × Period Heatmap */}
      <Card className="border-[#E2E5E9] shadow-card">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium text-[#2D3436] mb-3">语料矩阵 · 媒体×时段</h3>
          <MediaHeatmap data={data?.mediaPeriod ?? {}} />
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="border-[#E2E5E9] shadow-card">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium text-[#2D3436] mb-3">时间趋势 · 媒体分布</h3>
          <TimelineChart data={data?.mediaPeriod ?? {}} />
        </CardContent>
      </Card>

      {/* Coder Workload */}
      {data && Object.keys(data.coderWorkload).length > 0 && (
        <Card className="border-[#E2E5E9] shadow-card">
          <CardContent className="p-5">
            <h3 className="text-sm font-medium text-[#2D3436] mb-3">编码员工作量</h3>
            <CoderStats data={data.coderWorkload} />
          </CardContent>
        </Card>
      )}

      {/* Kappa Distribution */}
      <Card className="border-[#E2E5E9] shadow-card">
        <CardContent className="p-5">
          <h3 className="text-sm font-medium text-[#2D3436] mb-3">信度分布 · Cohen's Kappa</h3>
          <KappaChart values={data?.kappaValues ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
