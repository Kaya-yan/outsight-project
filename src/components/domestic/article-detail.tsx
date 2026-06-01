"use client";

import { useDomesticStore } from "@/stores/domestic-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, BarChart3, Loader2 } from "lucide-react";
import { useState, Component, type ComponentType } from "react";
import { LinguisticProfile } from "./linguistic-profile";

// ── Safe wrapper for dimension displays ──

function SafeDimDisplay({ data, Component: Comp }: { data: Record<string, unknown>; Component: ComponentType<{ data: Record<string, unknown> }> }) {
  try {
    if (!data || typeof data !== "object") {
      return <span className="text-xs text-[#E67E22]">数据格式异常</span>;
    }
    return <Comp data={data} />;
  } catch {
    return <span className="text-xs text-[#E67E22]">渲染失败，数据可能不完整</span>;
  }
}

// ── Dimension display components ──

function FrameDisplay({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#7F8A93]">主框架</span>
        <span className="text-sm font-medium text-[#4A90A4]">{data.primary_frame as string}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#7F8A93]">类型</span>
        <span className="text-xs px-2 py-0.5 rounded bg-[#E2E5E9] text-[#2D3436]">{data.frame_type as string}</span>
        <span className="text-xs text-[#95A5A6]">置信度 {((data.confidence as number) * 100).toFixed(0)}%</span>
      </div>
      {(data.framing_strategies as string[])?.length > 0 && (
        <div>
          <span className="text-xs text-[#7F8A93]">框架策略</span>
          <ul className="mt-1 space-y-0.5">
            {(data.framing_strategies as string[]).map((s, i) => (
              <li key={i} className="text-xs text-[#2D3436] pl-2 border-l-2 border-[#4A90A4]/30">{s}</li>
            ))}
          </ul>
        </div>
      )}
      {(data.key_evidence as string[])?.length > 0 && (
        <div>
          <span className="text-xs text-[#7F8A93]">原文证据</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {(data.key_evidence as string[]).map((e, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-[#F0F2F5] rounded text-[#7F8A93] italic">&quot;{e}&quot;</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DiscourseDisplay({ data }: { data: Record<string, unknown> }) {
  const dist = data.source_distribution as Record<string, number>;
  const entries = Object.entries(dist ?? {});
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const labels: Record<string, string> = {
    party_government: "党政", expert: "专家", enterprise: "企业", public: "民众", foreign_media: "外媒",
  };
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-xs text-[#7F8A93] w-10 shrink-0">{labels[key] ?? key}</span>
            <div className="flex-1 bg-[#E2E5E9] rounded-full h-2">
              <div className="bg-[#4A90A4] h-2 rounded-full" style={{ width: `${(val / max) * 100}%` }} />
            </div>
            <span className="text-xs text-[#95A5A6] w-6 text-right">{val}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-[#7F8A93]">
        <span>直接引语: {data.direct_quotes as number}</span>
        <span>间接引语: {data.indirect_quotes as number}</span>
        <span>领导人讲话: {data.leader_speech_count as number}</span>
      </div>
      {(data.leader_speech_examples as string[])?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(data.leader_speech_examples as string[]).map((e, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-[#F0F2F5] rounded text-[#7F8A93] italic">&quot;{e}&quot;</span>
          ))}
        </div>
      )}
    </div>
  );
}

function PolicyToolDisplay({ data }: { data: Record<string, unknown> }) {
  const tools = data.tools as { type: string; description: string; evidence: string }[] | undefined;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#7F8A93]">主导类型</span>
        <span className="text-xs px-2 py-0.5 rounded bg-[#E2E5E9] text-[#4A90A4]">{data.dominant_type as string}</span>
      </div>
      {tools && tools.length > 0 ? (
        <div className="space-y-1.5">
          {tools.map((t, i) => (
            <div key={i} className="p-2 bg-[#F0F2F5] rounded text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-1.5 py-0.5 rounded bg-[#E2E5E9] text-[#2D3436]">{t.type}</span>
                <span className="text-[#2D3436]">{t.description}</span>
              </div>
              <span className="text-[#95A5A6] italic">&quot;{t.evidence}&quot;</span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs text-[#95A5A6]">未识别到具体政策工具</span>
      )}
    </div>
  );
}

function SentimentDisplay({ data }: { data: Record<string, unknown> }) {
  const polarityColors: Record<string, string> = {
    positive: "text-emerald-400", neutral: "text-[#2D3436]", negative: "text-red-400",
  };
  const polarityLabels: Record<string, string> = {
    positive: "正面", neutral: "中性", negative: "负面",
  };
  const intensity = data.intensity as number;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className={`text-lg font-bold ${polarityColors[data.polarity as string] ?? "text-[#2D3436]"}`}>
          {polarityLabels[data.polarity as string] ?? (data.polarity as string)}
        </span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-sm ${i < intensity ? "bg-[#4A90A4]" : "bg-[#E2E5E9]"}`}
            />
          ))}
        </div>
        <span className="text-xs text-[#95A5A6]">强度 {intensity}/5</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[#7F8A93]">情感对象</span>
        <span className="text-[#2D3436]">{data.target as string}</span>
      </div>
      {(data.keywords as string[])?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(data.keywords as string[]).map((k, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#E2E5E9] text-[#2D3436]">{k}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function IntertextualityDisplay({ data }: { data: Record<string, unknown> }) {
  const categories = [
    { key: "policy_documents", label: "政策文件", nameKey: "name" },
    { key: "leader_speeches", label: "领导人讲话", nameKey: "speaker" },
    { key: "historical_events", label: "历史事件", nameKey: "event" },
    { key: "foreign_media_refs", label: "外媒引用", nameKey: "source" },
    { key: "classical_refs", label: "古典文献", nameKey: "text" },
  ];
  return (
    <div className="space-y-2">
      {categories.map((cat) => {
        const items = data[cat.key] as Record<string, string>[] | undefined;
        if (!items || items.length === 0) return null;
        return (
          <div key={cat.key}>
            <span className="text-xs text-[#7F8A93]">{cat.label} ({items.length})</span>
            <div className="mt-1 space-y-1">
              {items.map((item, i) => (
                <div key={i} className="text-xs flex items-start gap-2">
                  <span className="text-[#2D3436]">{item[cat.nameKey]}</span>
                  <span className="text-[#95A5A6] italic">&quot;{item.evidence}&quot;</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {categories.every((cat) => !(data[cat.key] as unknown[])?.length) && (
        <span className="text-xs text-[#95A5A6]">未检测到互文引用</span>
      )}
    </div>
  );
}

function SyntaxDisplay({ data }: { data: Record<string, unknown> }) {
  const formalityLabels = ["", "口语化", "非正式", "中等", "正式", "高度正式"];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-[#7F8A93]">平均句长</span>
          <span className="text-[#2D3436]">{data.avg_sentence_length as number} 字</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#7F8A93]">被动句比例</span>
          <span className="text-[#2D3436]">{((data.passive_sentence_ratio as number) * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#7F8A93]">政治术语密度</span>
          <span className="text-[#2D3436]">{(data.political_term_density as number).toFixed(1)}/百字</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#7F8A93]">数字使用频率</span>
          <span className="text-[#2D3436]">{(data.number_usage_frequency as number).toFixed(1)}/百字</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#7F8A93]">正式度</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-sm ${i < (data.formality_score as number) ? "bg-[#4A90A4]" : "bg-[#E2E5E9]"}`}
            />
          ))}
        </div>
        <span className="text-xs text-[#95A5A6]">{formalityLabels[data.formality_score as number]}</span>
      </div>
    </div>
  );
}

function NarrativeDisplay({ data }: { data: Record<string, unknown> }) {
  const voiceLabels: Record<string, string> = {
    omniscient: "全知叙述", reporter: "记者视角", quoted: "引语叙述", mixed: "混合视角",
  };
  const examples = data.narrative_examples as { type: string; evidence: string }[] | undefined;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#7F8A93]">宏观</span>
          <span className="text-sm text-[#4A90A4]">{((data.macro_narrative_ratio as number) * 100).toFixed(0)}%</span>
        </div>
        <div className="flex-1 bg-[#E2E5E9] rounded-full h-2 flex overflow-hidden">
          <div className="bg-[#4A90A4] h-2" style={{ width: `${(data.macro_narrative_ratio as number) * 100}%` }} />
          <div className="bg-emerald-500/60 h-2 flex-1" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-emerald-400">{((data.micro_narrative_ratio as number) * 100).toFixed(0)}%</span>
          <span className="text-xs text-[#7F8A93]">微观</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[#7F8A93]">叙事声音</span>
        <span className="px-2 py-0.5 rounded bg-[#E2E5E9] text-[#2D3436]">
          {voiceLabels[data.narrative_voice as string] ?? (data.narrative_voice as string)}
        </span>
      </div>
      {examples && examples.length > 0 && (
        <div className="space-y-1">
          {examples.map((ex, i) => (
            <div key={i} className="text-xs flex items-start gap-2">
              <span className={`px-1 py-0.5 rounded text-[10px] ${ex.type === "macro" ? "bg-[#4A90A4]/20 text-[#4A90A4]" : "bg-emerald-500/20 text-emerald-400"}`}>
                {ex.type === "macro" ? "宏观" : "微观"}
              </span>
              <span className="text-[#7F8A93] italic">&quot;{ex.evidence}&quot;</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SpatialDisplay({ data }: { data: Record<string, unknown> }) {
  const gl = data.governance_level as Record<string, number>;
  const gs = data.geographic_scope as Record<string, number>;
  const ur = data.urban_rural as Record<string, number>;
  const locations = data.key_locations as string[] | undefined;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-[#7F8A93] block mb-1">治理层级</span>
          <div className="flex gap-2">
            <span className="text-[#2D3436]">中央 {gl?.central ?? 0}</span>
            <span className="text-[#2D3436]">地方 {gl?.local ?? 0}</span>
          </div>
        </div>
        <div>
          <span className="text-[#7F8A93] block mb-1">地理范围</span>
          <div className="flex gap-2">
            <span className="text-[#2D3436]">国内 {gs?.domestic ?? 0}</span>
            <span className="text-[#2D3436]">国际 {gs?.international ?? 0}</span>
          </div>
        </div>
        <div>
          <span className="text-[#7F8A93] block mb-1">城乡指向</span>
          <div className="flex gap-2">
            <span className="text-[#2D3436]">城市 {ur?.urban ?? 0}</span>
            <span className="text-[#2D3436]">农村 {ur?.rural ?? 0}</span>
            <span className="text-[#2D3436]">中性 {ur?.neutral ?? 0}</span>
          </div>
        </div>
      </div>
      {locations && locations.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {locations.map((loc, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#E2E5E9] text-[#2D3436]">{loc}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Dimension wrapper ──

type DimComponent = { key: string; label: string; sub: string; color: string; Component: React.FC<{ data: Record<string, unknown> }> };

const DIMENSIONS: DimComponent[] = [
  { key: "frame", label: "议题框架", sub: "Entman", color: "#4A90A4", Component: FrameDisplay },
  { key: "discourse_actors", label: "话语主体", sub: "van Dijk", color: "#6C5CE7", Component: DiscourseDisplay },
  { key: "policy_tools", label: "政策工具", sub: "Rothwell & Zegveld", color: "#00B894", Component: PolicyToolDisplay },
  { key: "sentiment", label: "情感极性", sub: "Pang & Lee", color: "#E17055", Component: SentimentDisplay },
  { key: "intertextuality", label: "互文性", sub: "Kristeva", color: "#FDCB6E", Component: IntertextualityDisplay },
  { key: "syntax_formality", label: "句法正式度", sub: "Halliday", color: "#E84393", Component: SyntaxDisplay },
  { key: "narrative", label: "叙事视角", sub: "Genette", color: "#00CEC9", Component: NarrativeDisplay },
  { key: "spatial", label: "地域指向", sub: "Soja", color: "#A29BFE", Component: SpatialDisplay },
];

// ── Main Detail Component ──

const DIM_LABELS: Record<string, string> = {
  frame: "议题框架",
  discourse_actors: "话语主体",
  policy_tools: "政策工具",
  sentiment: "情感极性",
  intertextuality: "互文性",
  syntax_formality: "句法正式度",
  narrative: "叙事视角",
  spatial: "地域指向",
};

type DetailTab = "ai" | "linguistic";

// Feature flag: hide AI 8-dimension analysis until MiMo API content policy is resolved
const SHOW_DOMESTIC_AI_ANALYSIS = false;

export function ArticleDetail() {
  const activeArticle = useDomesticStore((s) => s.activeArticle);
  const isLoadingDetail = useDomesticStore((s) => s.isLoadingDetail);
  const analysisProgress = useDomesticStore((s) => s.analysisProgress);
  const clearActiveArticle = useDomesticStore((s) => s.clearActiveArticle);
  const triggerAnalysis = useDomesticStore((s) => s.triggerAnalysis);
  const [detailTab, setDetailTab] = useState<DetailTab>("linguistic");

  if (isLoadingDetail && analysisProgress.phase === "idle") {
    return (
      <Card className="border-[#E2E5E9]">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#4A90A4]" />
        </CardContent>
      </Card>
    );
  }

  if (!activeArticle) return null;

  const ai = (activeArticle.metadata as Record<string, unknown>)?.domestic_ai_analysis as Record<string, unknown> | undefined;
  const hasAnalysis = !!ai;
  const analyzedAt = ai?.analyzed_at as string | undefined;

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <button
        onClick={clearActiveArticle}
        className="flex items-center gap-1.5 text-xs text-[#7F8A93] hover:text-[#2D3436] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        返回列表
      </button>

      {/* Article Header */}
      <Card className="border-[#E2E5E9]">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-base font-medium text-[#2D3436] leading-relaxed">
            {activeArticle.title}
          </h2>
          <div className="flex items-center gap-3 text-xs text-[#7F8A93]">
            <span>{activeArticle.media}</span>
            <span>{activeArticle.publish_date}</span>
            <span>{activeArticle.word_count} 字</span>
            {activeArticle.author ? <span>{activeArticle.author}</span> : null}
          </div>
          {SHOW_DOMESTIC_AI_ANALYSIS && !hasAnalysis && analysisProgress.phase === "idle" && (
            <Button
              onClick={() => triggerAnalysis(activeArticle.id)}
              size="sm"
              className="bg-[#4A90A4] hover:bg-[#5BA1B5] text-white text-xs h-7"
            >
              <Brain className="h-3.5 w-3.5 mr-1" />
              执行 8 维度 AI 分析
            </Button>
          )}
          {SHOW_DOMESTIC_AI_ANALYSIS && analysisProgress.phase === "analyzing" && (
            <div className="space-y-2 p-3 bg-[#F7F8FA] rounded-lg border border-[#E2E5E9]">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4A90A4]" />
                <span className="text-xs text-[#2D3436]">
                  正在分析 {analysisProgress.current}/{analysisProgress.total}
                  {analysisProgress.currentDimension && ` · ${DIM_LABELS[analysisProgress.currentDimension] ?? analysisProgress.currentDimension}`}
                </span>
              </div>
              <div className="w-full bg-[#E2E5E9] rounded-full h-1.5">
                <div
                  className="h-full bg-[#4A90A4] rounded-full transition-all duration-500"
                  style={{ width: `${(analysisProgress.current / analysisProgress.total) * 100}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {DIMENSIONS.map((d) => {
                  const done = analysisProgress.current > DIMENSIONS.findIndex((x) => x.key === d.key);
                  const isCurrent = analysisProgress.currentDimension === d.key;
                  const hasError = analysisProgress.errors[d.key];
                  return (
                    <span
                      key={d.key}
                      className={`text-[9px] px-1.5 py-0.5 rounded ${
                        hasError ? "bg-[#E17055]/10 text-[#E17055]"
                        : done ? "bg-[#00B894]/10 text-[#00B894]"
                        : isCurrent ? "bg-[#4A90A4]/10 text-[#4A90A4] animate-pulse"
                        : "bg-[#E2E5E9] text-[#95A5A6]"
                      }`}
                    >
                      {d.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {SHOW_DOMESTIC_AI_ANALYSIS && analysisProgress.phase === "done" && !hasAnalysis && (
            <div className="text-xs text-[#00B894] flex items-center gap-1">
              分析完成，正在刷新...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Text */}
      <Card className="border-[#E2E5E9]">
        <CardContent className="p-4">
          <h3 className="text-xs text-[#7F8A93] mb-2">正文</h3>
          <div className="text-xs text-[#2D3436] leading-6 max-h-60 overflow-y-auto whitespace-pre-wrap">
            {activeArticle.full_text}
          </div>
        </CardContent>
      </Card>

      {/* Tab Switcher */}
      <div className="flex gap-1 border-b border-[#E2E5E9]">
        <button
          onClick={() => setDetailTab("linguistic")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
            detailTab === "linguistic"
              ? "border-[#1e3a5f] text-[#1e3a5f]"
              : "border-transparent text-[#7F8A93] hover:text-[#2D3436]"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          语言学画像
        </button>
        {SHOW_DOMESTIC_AI_ANALYSIS && (
          <button
            onClick={() => setDetailTab("ai")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              detailTab === "ai"
                ? "border-[#4A90A4] text-[#4A90A4]"
                : "border-transparent text-[#7F8A93] hover:text-[#2D3436]"
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            AI 分析
            {hasAnalysis && <span className="w-1.5 h-1.5 rounded-full bg-[#00B894]" />}
            {!hasAnalysis && analysisProgress.phase === "analyzing" && <span className="w-1.5 h-1.5 rounded-full bg-[#4A90A4] animate-pulse" />}
          </button>
        )}
      </div>

      {/* Tab Content: Linguistic Profile */}
      {detailTab === "linguistic" && (
        <LinguisticProfile articleId={activeArticle.id} />
      )}

      {/* Tab Content: 8-Dimension AI Analysis */}
      {detailTab === "ai" && hasAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {DIMENSIONS.map(({ key, label, sub, color, Component }) => {
            const dimData = ai[key] as Record<string, unknown> | null;
            const errors = ai.errors as Record<string, string | null> | undefined;
            const dimError = errors?.[key];
            return (
              <Card key={key} className="border-[#E2E5E9]">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs font-medium text-[#2D3436]">{label}</span>
                    <span className="text-[10px] text-[#95A5A6]">{sub}</span>
                  </div>
                  {dimData ? (
                    <SafeDimDisplay data={dimData} Component={Component} />
                  ) : (
                    <div className="text-xs">
                      <span className="text-[#E67E22]">分析失败</span>
                      {dimError && <span className="text-[#95A5A6] ml-1">— {dimError}</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* AI tab: no analysis yet */}
      {detailTab === "ai" && !hasAnalysis && analysisProgress.phase === "idle" && (
        <Card className="border-[#E2E5E9]">
          <CardContent className="p-6 flex flex-col items-center gap-3">
            <Brain className="h-8 w-8 text-[#4A90A4]" />
            <p className="text-sm text-[#7F8A93]">尚未执行 AI 分析</p>
            <button
              onClick={() => triggerAnalysis(activeArticle.id)}
              className="px-4 py-2 bg-[#4A90A4] text-white text-xs rounded-md hover:bg-[#5BA1B5] transition-colors"
            >
              执行 8 维度 AI 分析
            </button>
          </CardContent>
        </Card>
      )}

      {/* Analyzed timestamp */}
      {detailTab === "ai" && analyzedAt ? (
        <p className="text-[10px] text-[#95A5A6] text-right">
          分析于 {new Date(analyzedAt).toLocaleString("zh-CN")}
        </p>
      ) : null}
    </div>
  );
}
