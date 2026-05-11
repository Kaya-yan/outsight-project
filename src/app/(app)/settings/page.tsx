"use client";

import { useState } from "react";
import { useAuthStore, selectCanManageAssignments } from "@/stores/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FrameworkManager } from "@/components/coding/framework-manager";
import { ToolCard } from "@/components/tools/tool-card";
import { TextCleaner } from "@/components/tools/text-cleaner";
import { WordCounter } from "@/components/tools/word-counter";
import { FileNamer } from "@/components/tools/file-namer";
import { RandomSampler } from "@/components/tools/random-sampler";
import { PeriodSplitter } from "@/components/tools/period-splitter";
import { CoOccurrence } from "@/components/tools/co-occurrence";
import { SentimentCalc } from "@/components/tools/sentiment-calc";
import { KappaCalc } from "@/components/tools/kappa-calc";
import { CitationGen } from "@/components/tools/citation-gen";
import { PromptKit } from "@/components/tools/prompt-kit";
import { ProQuestGuide } from "@/components/tools/proquest-guide";
import {
  Wrench, Brush, Hash, FileText, Shuffle, Calendar, GitBranch,
  ThumbsUp, Calculator, BookOpen, Wand2, Search, Download, X,
  Lock, AlertTriangle,
} from "lucide-react";

const tools = [
  { id: "text-cleaner", icon: Brush, title: "文本净化", desc: "一键清除 HTML 标签、广告链接、多余空行" },
  { id: "word-counter", icon: Hash, title: "词数青禾", desc: "统计词数、句数、平均句长、独特词汇" },
  { id: "file-namer", icon: FileText, title: "命名标准化", desc: "按「媒体_日期_编号.txt」格式生成文件名" },
  { id: "random-sampler", icon: Shuffle, title: "随机抽样", desc: "科学随机编号输出，支持种子复现" },
  { id: "period-splitter", icon: Calendar, title: "时段切分", desc: "按年/季度/半年自动分段" },
  { id: "co-occurrence", icon: GitBranch, title: "共现提取", desc: "提取 TOP 20 高频词对" },
  { id: "sentiment-calc", icon: ThumbsUp, title: "情感速算", desc: "基于内置词库统计正/负面词频" },
  { id: "kappa-calc", icon: Calculator, title: "信度算盘", desc: "输入两人编码 → 一致率 + Cohen&apos;s Kappa" },
  { id: "citation-gen", icon: BookOpen, title: "引文生成器", desc: "DOI 自动获取 → GB/T 7714 / APA / MLA" },
  { id: "prompt-kit", icon: Wand2, title: "Prompt 锦囊", desc: "学术润色 · 中译英 · 摘要提炼 · 关键词" },
  { id: "proquest", icon: Search, title: "ProQuest 指南针", desc: "生成 ProQuest 学术检索式" },
  { id: "export", icon: Download, title: "数据工场", desc: "导出语料 CSV / JSON 数据包" },
];

export default function SettingsPage() {
  const canManage = useAuthStore(selectCanManageAssignments);
  const isAdmin = useAuthStore((s) => s.profile?.role === "admin");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [showFreeze, setShowFreeze] = useState(false);
  const [freezeResult, setFreezeResult] = useState<string | null>(null);
  const [isFreezing, setIsFreezing] = useState(false);

  async function handleFreeze() {
    setIsFreezing(true);
    try {
      const res = await fetch("/api/project/freeze", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setFreezeResult(json.message);
        setShowFreeze(false);
      } else {
        setFreezeResult(json.error ?? "封存失败");
      }
    } catch {
      setFreezeResult("封存请求失败");
    } finally {
      setIsFreezing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-xl font-semibold text-[#2D3436]">系统设置</h1>

      {/* Framework Manager — admin/lead only */}
      {canManage && (
        <Card className="border-[#E2E5E9] shadow-card">
          <CardContent className="p-5">
            <FrameworkManager />
          </CardContent>
        </Card>
      )}

      {/* Project Management — admin only */}
      {isAdmin && (
        <Card className="border-[#E2E5E9] shadow-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#E67E22]" />
                <div>
                  <h3 className="text-sm font-medium text-[#2D3436]">项目封存</h3>
                  <p className="text-xs text-[#7F8A93] mt-0.5">
                    将所有语料状态锁定为「已封存」，封存后不可撤销
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowFreeze(true)}
                variant="outline"
                className="h-8 text-xs text-[#E67E22] border-[#E67E22]/30 hover:bg-[#E67E22]/5"
              >
                <Lock className="h-3.5 w-3.5 mr-1" />
                封存项目
              </Button>
            </div>
            {freezeResult && (
              <p className="mt-3 text-xs text-[#5DAD93] bg-[#5DAD93]/5 rounded px-3 py-2">
                {freezeResult}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Freeze Confirmation Modal */}
      {showFreeze && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowFreeze(false)} />
          <Card className="relative z-10 w-full max-w-sm border-[#E67E22]/30 shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-[#E67E22]" />
                <h3 className="text-sm font-semibold text-[#2D3436]">确认项目封存</h3>
              </div>
              <p className="text-xs text-[#7F8A93] mb-4">
                此操作将把所有非已封存语料的状态锁定为「已封存」。<br />
                <strong className="text-[#E67E22]">此操作不可撤销。</strong>
              </p>
              <div className="flex justify-end gap-2">
                <Button onClick={() => setShowFreeze(false)} variant="outline" className="h-8 text-xs">
                  取消
                </Button>
                <Button onClick={handleFreeze} disabled={isFreezing} className="h-8 text-xs bg-[#E67E22] hover:bg-[#D46E1A] text-white">
                  {isFreezing ? "封存中..." : "确认封存"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Research Toolkit */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="h-4 w-4 text-[#4A90A4]" />
          <h2 className="text-sm font-semibold text-[#2D3436]">研究工具箱</h2>
          <span className="text-xs text-[#95A5A6]">共 12 项</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              icon={tool.icon}
              title={tool.title}
              desc={tool.desc}
              onClick={() => setActiveTool(tool.id)}
            />
          ))}
        </div>
      </div>

      {/* Tool Modal */}
      {activeTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setActiveTool(null)} />
          <Card className="relative z-10 w-full max-w-2xl max-h-[85vh] border-[#E2E5E9] shadow-lg overflow-hidden flex flex-col">
            <CardContent className="p-5 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {(() => {
                    const tool = tools.find((t) => t.id === activeTool);
                    if (!tool) return null;
                    const Icon = tool.icon;
                    return (
                      <>
                        <Icon className="h-4 w-4 text-[#4A90A4]" />
                        <h3 className="text-sm font-semibold text-[#2D3436]">{tool.title}</h3>
                      </>
                    );
                  })()}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTool(null)}
                  className="text-[#95A5A6] hover:text-[#2D3436]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {activeTool === "text-cleaner" && <TextCleaner />}
              {activeTool === "word-counter" && <WordCounter />}
              {activeTool === "file-namer" && <FileNamer />}
              {activeTool === "random-sampler" && <RandomSampler />}
              {activeTool === "period-splitter" && <PeriodSplitter />}
              {activeTool === "co-occurrence" && <CoOccurrence />}
              {activeTool === "sentiment-calc" && <SentimentCalc />}
              {activeTool === "kappa-calc" && <KappaCalc />}
              {activeTool === "citation-gen" && <CitationGen />}
              {activeTool === "prompt-kit" && <PromptKit />}
              {activeTool === "proquest" && <ProQuestGuide />}
              {activeTool === "export" && <ExportTool />}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Export tool (inline since it needs auth)
function ExportTool() {
  const [type, setType] = useState("csv");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleExport() {
    setIsLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/tools/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (type === "csv") {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `outsight_export_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage("CSV 下载已开始");
      } else {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `outsight_export_${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setMessage("JSON 下载已开始");
      }
    } catch {
      setMessage("导出失败");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["csv", "json"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-3 py-1 rounded text-xs ${type === t ? "bg-[#4A90A4] text-white" : "bg-[#F0F2F5] text-[#7F8A93]"}`}
          >
            {t === "csv" ? "CSV 元数据表" : "JSON 全量数据"}
          </button>
        ))}
      </div>
      <button
        onClick={handleExport}
        disabled={isLoading}
        className="h-8 text-xs px-4 rounded bg-[#4A90A4] hover:bg-[#3D7D8F] text-white inline-flex items-center gap-1"
      >
        <Download className="h-3.5 w-3.5" />
        {isLoading ? "导出中..." : "导出"}
      </button>
      {message && <p className="text-xs text-[#5DAD93]">{message}</p>}
    </div>
  );
}
