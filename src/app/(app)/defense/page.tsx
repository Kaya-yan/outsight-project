"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FrameworkPie } from "@/components/analytics/framework-pie";
import { MediaHeatmap } from "@/components/analytics/media-heatmap";
import { KappaChart } from "@/components/analytics/kappa-chart";
import {
  BookOpen, Globe, Calendar, CheckCircle2,
  Calculator, Copy, Download, Brain,
} from "lucide-react";

interface DefenseData {
  totalArticles: number;
  codedArticles: number;
  mediaCount: number;
  periodRange: string;
  avgKappa: number | null;
  frameworkName: string;
  nodeCount: number;
  frameworkDistribution: Record<string, number>;
  mediaPeriod: Record<string, Record<string, number>>;
  kappaValues: number[];
  periods: string[];
  medias: string[];
}

export default function DefensePage() {
  const [data, setData] = useState<DefenseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, analyticsRes] = await Promise.all([
          fetch("/api/dashboard/stats"),
          fetch("/api/analytics"),
        ]);
        const [statsJson, analyticsJson] = await Promise.all([
          statsRes.json(),
          analyticsRes.json(),
        ]);

        const stats = statsJson.data;
        const analytics = analyticsJson.data;

        // Get framework info
        const fwRes = await fetch("/api/frameworks");
        const fwJson = await fwRes.json();
        const frameworks = fwJson.data ?? [];

        setData({
          totalArticles: stats?.totalArticles ?? 0,
          codedArticles: stats?.byStatus?.["编码完成"] ?? 0,
          mediaCount: new Set(Object.keys(stats?.byMedia ?? {})).size || 6,
          periodRange: Object.keys(stats?.byPeriod ?? {}).join(" → "),
          avgKappa: analytics?.kappaValues?.length > 0
            ? Math.round((analytics.kappaValues.reduce((a: number, b: number) => a + b, 0) / analytics.kappaValues.length) * 1000) / 1000
            : null,
          frameworkName: frameworks[0]?.name_zh ?? frameworks[0]?.name ?? "编码框架",
          nodeCount: 0,
          frameworkDistribution: analytics?.frameworkDistribution ?? {},
          mediaPeriod: analytics?.mediaPeriod ?? {},
          kappaValues: analytics?.kappaValues ?? [],
          periods: Object.keys(stats?.byPeriod ?? {}),
          medias: Object.keys(stats?.byMedia ?? {}),
        });
      } catch {
        // Silent
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  function getMethodology(): string {
    if (!data) return "";
    const now = new Date().toISOString().split("T")[0];
    return (
      `本研究采用内容分析法与话语分析法相结合的方式，对英语主流媒体涉华报道进行系统编码与分析。\n\n` +
      `【语料来源】本研究选取 ${data.mediaCount} 家英语主流媒体（${data.medias.join("、")}），` +
      `覆盖研究时段 ${data.periods.join("、")}，` +
      `共采集并清洗有效语料 ${data.totalArticles} 篇，其中完成编码 ${data.codedArticles} 篇。\n\n` +
      `【编码框架】采用动态编码框架「${data.frameworkName}」，` +
      `由两名编码员独立标注。` +
      (data.avgKappa !== null
        ? `经信度检验，Cohen&apos;s Kappa 均值为 ${data.avgKappa}，编码质量良好。`
        : "") +
      `\n\n【分析工具】编码与统计分析基于自主开发的 OutSight 外眼 2.0 话语研究协作平台，` +
      `AI 预读辅助采用 DeepSeek 大语言模型（默认收起，标注员独立判断）。\n\n` +
      `【导出日期】${now}`
    );
  }

  function copyMethodology() {
    const text = getMethodology();
    navigator.clipboard.writeText(text);
    setCopied("methodology");
    setTimeout(() => setCopied(""), 2000);
  }

  async function exportData() {
    try {
      const res = await fetch("/api/tools/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "json" }),
      });
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `outsight_defense_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silent
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-[#7F8A93]">加载答辩数据...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Title */}
      <div className="text-center py-6">
        <h1 className="text-2xl font-bold text-[#2D3436]">OutSight 外眼 2.0</h1>
        <p className="text-sm text-[#7F8A93] mt-1">话语研究协作平台 · 研究数据总览</p>
        <p className="text-xs text-[#95A5A6] mt-0.5">
          导出日期：{new Date().toISOString().split("T")[0]}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { icon: BookOpen, label: "入库语料", value: data?.totalArticles ?? "-", color: "#4A90A4" },
          { icon: Globe, label: "覆盖媒体", value: data?.mediaCount ?? "-", color: "#5DAD93" },
          { icon: Calendar, label: "研究时段", value: data?.periods.length ?? "-", color: "#2D3436" },
          { icon: CheckCircle2, label: "编码完成", value: data?.codedArticles ?? "-", color: "#5DAD93" },
          { icon: Calculator, label: "Kappa 均值", value: data?.avgKappa?.toFixed(3) ?? "-", color: "#4A90A4" },
        ].map((m) => (
          <Card key={m.label} className="border-[#E2E5E9] shadow-card">
            <CardContent className="p-4 text-center">
              <m.icon className="h-6 w-6 mx-auto mb-2" style={{ color: m.color }} />
              <p className="text-2xl font-bold font-mono" style={{ color: m.color }}>
                {m.value}
              </p>
              <p className="text-xs text-[#7F8A93] mt-1">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Methodology */}
      <Card className="border-[#E2E5E9] shadow-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#2D3436] flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#4A90A4]" />
              研究方法摘要
            </h2>
            <Button onClick={copyMethodology} variant="outline" className="h-8 text-xs gap-1">
              <Copy className="h-3.5 w-3.5" />
              {copied === "methodology" ? "已复制" : "复制全文"}
            </Button>
          </div>
          <pre className="text-sm text-[#2D3436] leading-relaxed whitespace-pre-wrap font-sans bg-[#FAFBFC] rounded p-4">
            {getMethodology()}
          </pre>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-[#E2E5E9] shadow-card">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-[#2D3436] mb-3">框架分布</h3>
            <FrameworkPie data={data?.frameworkDistribution ?? {}} />
          </CardContent>
        </Card>
        <Card className="border-[#E2E5E9] shadow-card">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-[#2D3436] mb-3">媒体×时段矩阵</h3>
            <MediaHeatmap data={data?.mediaPeriod ?? {}} />
          </CardContent>
        </Card>
      </div>

      {/* Kappa */}
      {(data?.kappaValues?.length ?? 0) > 0 && (
        <Card className="border-[#E2E5E9] shadow-card">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-[#2D3436] mb-3">信度分布 · Cohen&apos;s Kappa</h3>
            <KappaChart values={data?.kappaValues ?? []} />
          </CardContent>
        </Card>
      )}

      {/* Export */}
      <div className="flex justify-center gap-3 pb-8">
        <Button onClick={exportData} className="h-9 text-sm gap-2 bg-[#4A90A4] text-white">
          <Download className="h-4 w-4" />
          导出研究数据（JSON）
        </Button>
      </div>
    </div>
  );
}
