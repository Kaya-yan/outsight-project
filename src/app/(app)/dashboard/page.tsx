"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { MediaMatrix } from "@/components/articles/media-matrix";
import { StatusBadge } from "@/components/articles/status-badge";
import {
  LayoutDashboard,
  FolderOpen,
  Code2,
  BarChart3,
  Wrench,
  FileText,
} from "lucide-react";

const modules = [
  {
    icon: FolderOpen,
    title: "语料工作台",
    desc: "采集、清洗、管理新闻语料",
    href: "/projects",
  },
  {
    icon: Code2,
    title: "编码实验室",
    desc: "动态框架 · 双人编码 · 信度检验",
    href: "/coding",
  },
  {
    icon: BarChart3,
    title: "统计分析",
    desc: "框架分布 · 时间演变 · 一致性报表",
    href: "/analytics",
  },
  {
    icon: Wrench,
    title: "研究工具箱",
    desc: "引文生成 · 命名标准化 · 信度算盘",
    href: "/settings",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { stats, isLoading, fetchStats } = useDashboardStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const greeting = profile
    ? `${profile.display_name || profile.username}，欢迎回来`
    : "欢迎来到 OutSight";

  const codedCount = stats?.byStatus?.["编码完成"] ?? 0;
  const preReadCount = stats?.byStatus?.["已预读"] ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold text-[#2D3436]">{greeting}</h1>
        <p className="mt-1 text-sm text-[#7F8A93]">
          话语研究协作平台 · 研究控制台
        </p>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modules.map((mod) => (
          <Card
            key={mod.href}
            className="border-[#E2E5E9] shadow-card hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              router.push(mod.href);
            }}
          >
            <CardContent className="p-5 flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#4A90A4]/10">
                <mod.icon className="h-5 w-5 text-[#4A90A4]" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#2D3436]">{mod.title}</h3>
                <p className="mt-0.5 text-xs text-[#7F8A93]">{mod.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Status */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-[#E2E5E9] shadow-card">
          <CardContent className="p-4 text-center">
            {isLoading ? (
              <Skeleton className="h-8 w-12 mx-auto" />
            ) : (
              <p className="text-2xl font-semibold text-[#4A90A4] font-mono">
                {stats?.totalArticles ?? "-"}
              </p>
            )}
            <p className="text-xs text-[#7F8A93] mt-1">入库语料</p>
          </CardContent>
        </Card>
        <Card className="border-[#E2E5E9] shadow-card">
          <CardContent className="p-4 text-center">
            {isLoading ? (
              <Skeleton className="h-8 w-12 mx-auto" />
            ) : (
              <p className="text-2xl font-semibold text-[#5DAD93] font-mono">
                {codedCount}
              </p>
            )}
            <p className="text-xs text-[#7F8A93] mt-1">编码完成</p>
          </CardContent>
        </Card>
        <Card className="border-[#E2E5E9] shadow-card">
          <CardContent className="p-4 text-center">
            {isLoading ? (
              <Skeleton className="h-8 w-12 mx-auto" />
            ) : (
              <p className="text-2xl font-semibold text-[#E67E22] font-mono">
                {preReadCount}
              </p>
            )}
            <p className="text-xs text-[#7F8A93] mt-1">已预读</p>
          </CardContent>
        </Card>
      </div>

      {/* Media Matrix Mini */}
      {stats && (
        <Card className="border-[#E2E5E9] shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[#2D3436]">语料矩阵</h3>
              <span className="text-xs text-[#7F8A93]">6 媒体 × 7 时段</span>
            </div>
            <MediaMatrix
              mini
              data={stats.byMedia ? buildMatrixData(stats.byMedia, stats.byPeriod) : {}}
              onCellClick={(media, period) => {
                router.push(`/projects?media=${media}&period=${period}`);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Recent Articles */}
      {stats && stats.recentArticles.length > 0 && (
        <Card className="border-[#E2E5E9] shadow-card">
          <CardContent className="p-5">
            <h3 className="text-sm font-medium text-[#2D3436] mb-3">最近语料</h3>
            <div className="space-y-2">
              {stats.recentArticles.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 text-sm"
                >
                  <FileText className="h-4 w-4 text-[#7F8A93] shrink-0" />
                  <span className="flex-1 truncate text-[#2D3436]">{a.title}</span>
                  <span className="text-xs text-[#7F8A93]">{a.media}</span>
                  <StatusBadge status={a.status} size="sm" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State when no data */}
      {!isLoading && stats && stats.totalArticles === 0 && (
        <Card className="border-[#E2E5E9] shadow-card">
          <CardContent className="p-6">
            <EmptyState
              icon={LayoutDashboard}
              title="暂无活跃项目"
              description="当语料入库并开始编码后，控制台将展示里程碑进度、语料矩阵和任务概览。"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Build matrix data from flat byMedia/byPeriod objects
function buildMatrixData(
  byMedia: Record<string, number>,
  byPeriod: Record<string, number>,
): Record<string, Record<string, number>> {
  // For mini view, the data structure needs to be: data[media][period] = count
  // We only have separate counts, so we create a simple structure
  // In practice this needs a proper cross-tab query — for Sprint 1 this is a placeholder
  // The real matrix would need a GROUP BY media, period query
  const result: Record<string, Record<string, number>> = {};
  for (const media of Object.keys(byMedia)) {
    result[media] = {};
    for (const period of Object.keys(byPeriod)) {
      result[media][period] = 0;
    }
  }
  return result;
}
