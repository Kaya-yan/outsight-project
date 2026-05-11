"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Brain, Loader2 } from "lucide-react";

interface AiResult {
  summary: string | null;
  summaryZh: string | null;
  sentiment: string | null;
  confidence: number | null;
  framework_hint: string | null;
  evidence_quotes: string[];
  metadata?: Record<string, unknown>;
}

interface AiPanelProps {
  articleId: string;
  articleStatus: string;
  onPreReadComplete?: () => void;
}

const PANEL_PREF_KEY = "outsight-ai-panel-open";

export function AiPanel({ articleId, articleStatus, onPreReadComplete }: AiPanelProps) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(PANEL_PREF_KEY) === "true";
  });
  const [aiData, setAiData] = useState<AiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreReading, setIsPreReading] = useState(false);

  const loadAiData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ai/pre-read/${articleId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data?.hasAiData) setAiData(json.data);
      }
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    loadAiData();
  }, [loadAiData]);

  function toggle() {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem(PANEL_PREF_KEY, String(next));
      return next;
    });
  }

  async function handlePreRead() {
    setIsPreReading(true);
    try {
      const res = await fetch("/api/ai/pre-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });
      if (res.ok) {
        const json = await res.json();
        const r = json.results;
        setAiData({
          summary: r?.summary,
          summaryZh: r?.summaryZh,
          sentiment: r?.sentiment?.sentiment,
          confidence: r?.sentiment?.confidence,
          framework_hint: r?.framework?.framework,
          evidence_quotes: r?.framework?.evidence ?? [],
          metadata: json.data?.metadata,
        });
        setIsOpen(true);
        onPreReadComplete?.();
      }
    } catch {
      // Silent
    } finally {
      setIsPreReading(false);
    }
  }

  const canPreRead = ["已清洗", "已入库", "已下载全文", "待编码", "已预读"].includes(articleStatus);
  const hasAiData = !!(aiData?.summary || aiData?.sentiment || aiData?.framework_hint);

  const narrative = aiData?.metadata?.ai_narrative as Record<string, unknown> | undefined;
  const sources = aiData?.metadata?.ai_sources as Record<string, unknown> | undefined;
  const tone = aiData?.metadata?.ai_tone as Record<string, unknown> | undefined;
  const linguistic = aiData?.metadata?.ai_linguistic as Record<string, unknown> | undefined;

  return (
    <Card className="border-[#E2E5E9] shadow-card">
      {/* Header */}
      <button
        type="button"
        onClick={toggle}
        className="flex items-center justify-between w-full p-3 text-left hover:bg-[#F0F2F5]/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-[#4A90A4]" />
          <span className="text-sm font-medium text-[#2D3436]">AI 预读参考</span>
          {hasAiData && (
            <Badge className="text-[10px] bg-[#5DAD93]/10 text-[#5DAD93]">有数据</Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-[#7F8A93]" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[#7F8A93]" />
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <CardContent className="px-4 pb-4 pt-0 space-y-3 text-sm">
          {isLoading ? (
            <p className="text-xs text-[#7F8A93]">加载中...</p>
          ) : !hasAiData ? (
            <div className="text-center py-3">
              <p className="text-xs text-[#7F8A93] mb-2">暂无 AI 预读数据</p>
              {canPreRead && (
                <Button
                  onClick={handlePreRead}
                  disabled={isPreReading}
                  className="h-7 text-xs bg-[#4A90A4] hover:bg-[#3D7D8F] text-white"
                >
                  {isPreReading ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      AI 分析中...
                    </>
                  ) : (
                    "执行 AI 预读"
                  )}
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Chinese Summary — shown first as most important */}
              {aiData.summaryZh && (
                <Section title="中文摘要">
                  <p className="text-xs leading-relaxed text-[#2D3436]">
                    {aiData.summaryZh}
                  </p>
                </Section>
              )}

              {/* English Summary */}
              {aiData.summary && (
                <Section title="核心摘要 (EN)">
                  <p className="text-xs leading-relaxed text-[#4A5568] italic">
                    &ldquo;{aiData.summary}&rdquo;
                  </p>
                </Section>
              )}

              {/* Sentiment */}
              {aiData.sentiment && (
                <Section title="情感倾向">
                  <div className="flex items-center gap-2">
                    <Badge className={
                      aiData.sentiment === "positive" ? "bg-[#5DAD93]/10 text-[#5DAD93]" :
                      aiData.sentiment === "negative" ? "bg-[#E67E22]/10 text-[#E67E22]" :
                      "bg-[#7F8A93]/10 text-[#7F8A93]"
                    }>
                      {aiData.sentiment === "positive" ? "正面" :
                       aiData.sentiment === "negative" ? "负面" : "中立"}
                    </Badge>
                    {aiData.confidence != null && (
                      <span className="text-xs text-[#7F8A93]">
                        置信度 {Math.round(aiData.confidence * 100)}%
                      </span>
                    )}
                  </div>
                </Section>
              )}

              {/* Framework Hint */}
              {aiData.framework_hint && (
                <Section title="框架初判">
                  <Badge className="text-[10px] bg-[#4A90A4]/10 text-[#4A90A4]">
                    {aiData.framework_hint}
                  </Badge>
                </Section>
              )}

              {/* Narrative Style */}
              {narrative && (
                <Section title="叙事风格">
                  <Badge className="text-[10px] bg-[#5DAD93]/10 text-[#5DAD93] mb-1">
                    {(narrative.style as string) ?? "未知"}
                  </Badge>
                  {narrative.explanation && (
                    <p className="text-xs text-[#4A5568] mt-1">
                      {narrative.explanation as string}
                    </p>
                  )}
                  {narrative.framing_devices && (narrative.framing_devices as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(narrative.framing_devices as string[]).map((d, i) => (
                        <Badge key={i} className="text-[10px] bg-[#F0F2F5] text-[#2D3436]">{d}</Badge>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {/* Tone */}
              {tone && (
                <Section title="语气调性">
                  <div className="flex items-center gap-2">
                    <Badge className={
                      (tone.tone as string) === "critical" ? "bg-[#E67E22]/10 text-[#E67E22]" :
                      (tone.tone as string) === "constructive" ? "bg-[#5DAD93]/10 text-[#5DAD93]" :
                      (tone.tone as string) === "alarming" ? "bg-[#E67E22]/10 text-[#E67E22]" :
                      "bg-[#4A90A4]/10 text-[#4A90A4]"
                    }>
                      {(tone.tone as string) === "critical" ? "批判性" :
                       (tone.tone as string) === "constructive" ? "建设性" :
                       (tone.tone as string) === "descriptive" ? "描述性" :
                       (tone.tone as string) === "alarming" ? "警示性" :
                       (tone.tone as string) === "celebratory" ? "赞扬性" :
                       (tone.tone as string) ?? "未知"}
                    </Badge>
                    {tone.confidence != null && (
                      <span className="text-xs text-[#7F8A93]">
                        置信度 {Math.round((tone.confidence as number) * 100)}%
                      </span>
                    )}
                  </div>
                  {tone.keywords && (tone.keywords as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(tone.keywords as string[]).map((k, i) => (
                        <Badge key={i} className="text-[10px] bg-[#F0F2F5] text-[#7F8A93]">{k}</Badge>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {/* Source Analysis */}
              {sources && (
                <Section title="消息源分析">
                  {sources.source_types && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {Object.entries(sources.source_types as Record<string, number>).map(([k, v]) => (
                        <Badge key={k} className="text-[10px] bg-[#4A90A4]/5 text-[#4A90A4]">
                          {k === "official" ? "官方" :
                           k === "expert" ? "专家" :
                           k === "public" ? "民众" :
                           k === "anonymous" ? "匿名" :
                           k === "media" ? "媒体" :
                           k === "corporate" ? "企业" : k}: {v}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {sources.named_sources && (sources.named_sources as string[]).length > 0 && (
                    <p className="text-xs text-[#4A5568]">
                      具名来源：{(sources.named_sources as string[]).join("、")}
                    </p>
                  )}
                  {sources.anonymous_count != null && (sources.anonymous_count as number) > 0 && (
                    <p className="text-xs text-[#E67E22] mt-0.5">
                      匿名来源 {(sources.anonymous_count as number)} 处
                    </p>
                  )}
                </Section>
              )}

              {/* Evidence Quotes */}
              {aiData.evidence_quotes.length > 0 && (
                <Section title="关键证据句">
                  <ul className="space-y-1">
                    {aiData.evidence_quotes.map((q, i) => (
                      <li key={i} className="text-xs text-[#4A5568] pl-3 border-l-2 border-[#4A90A4]/30">
                        &ldquo;{q}&rdquo;
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* Terminology */}
              {aiData.metadata?.ai_terms && (
                <Section title="术语采摘">
                  <div className="flex flex-wrap gap-1">
                    {(aiData.metadata.ai_terms as string[]).map((t, i) => (
                      <Badge key={i} className="text-[10px] bg-[#F0F2F5] text-[#2D3436]">{t}</Badge>
                    ))}
                  </div>
                </Section>
              )}

              {/* Linguistic */}
              {linguistic && (
                <Section title="语言观察">
                  {linguistic.passive_voice && (linguistic.passive_voice as string[]).length > 0 && (
                    <div className="mb-1">
                      <span className="text-[10px] text-[#7F8A93]">被动句式：</span>
                      {(linguistic.passive_voice as string[]).slice(0, 3).map((p, i) => (
                        <span key={i} className="text-xs text-[#4A5568] italic">
                          &ldquo;{p}&rdquo;{i < Math.min((linguistic.passive_voice as string[]).length, 3) - 1 ? "、" : ""}
                        </span>
                      ))}
                    </div>
                  )}
                  {linguistic.citation_types && (linguistic.citation_types as string[]).length > 0 && (
                    <div>
                      <span className="text-[10px] text-[#7F8A93]">引用类型：</span>
                      <span className="text-xs text-[#4A5568]">
                        {(linguistic.citation_types as string[]).join("、")}
                      </span>
                    </div>
                  )}
                </Section>
              )}
            </>
          )}

          <p className="text-[10px] text-[#95A5A6] italic">
            AI 结果仅供参考，标注员需独立判断
          </p>
        </CardContent>
      )}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-[#7F8A93] mb-1">{title}</p>
      {children}
    </div>
  );
}
