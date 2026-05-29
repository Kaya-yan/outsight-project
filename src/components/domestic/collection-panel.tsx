"use client";

import { useState } from "react";
import { useDomesticStore } from "@/stores/domestic-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MEDIA_ADAPTERS } from "@/lib/domestic/media-adapters";
import { Play, Square, ChevronDown, ChevronUp } from "lucide-react";

export function CollectionPanel() {
  const { startCollect, isCollecting, collectProgress } = useDomesticStore();

  const [selectedMedia, setSelectedMedia] = useState<string[]>(
    MEDIA_ADAPTERS.map((a) => a.id),
  );
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [keywords, setKeywords] = useState("");
  const [minWordCount, setMinWordCount] = useState(0);
  const [dedup, setDedup] = useState(true);
  const [delayMs, setDelayMs] = useState(1500);
  const [autoAnalyze, setAutoAnalyze] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleMedia = (id: string) => {
    setSelectedMedia((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const handleStart = () => {
    if (selectedMedia.length === 0) return;
    startCollect({
      mediaIds: selectedMedia,
      dateFrom,
      dateTo,
      keywords: keywords || undefined,
      minWordCount: minWordCount > 0 ? minWordCount : undefined,
      dedup,
      delayMs,
      autoAnalyze,
    });
  };

  return (
    <Card className="border-[#3D4446] bg-[#1A1D1E]">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-200">采集面板</h3>
          <span className="text-xs text-gray-500">国媒语料库</span>
        </div>

        {/* Media Multi-Select */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">媒体源</label>
          <div className="flex flex-wrap gap-2">
            {MEDIA_ADAPTERS.map((adapter) => {
              const selected = selectedMedia.includes(adapter.id);
              return (
                <button
                  key={adapter.id}
                  onClick={() => toggleMedia(adapter.id)}
                  className={`
                    px-3 py-1.5 text-xs rounded-md border transition-colors
                    ${selected
                      ? "bg-[#4A90A4]/20 border-[#4A90A4] text-[#4A90A4]"
                      : "bg-[#2D3436] border-[#3D4446] text-gray-400 hover:border-gray-500"
                    }
                  `}
                >
                  {adapter.name}
                  <span className="ml-1 opacity-50">
                    {adapter.sourceType === "government" ? "·政务" : "·主流"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">起始日期</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-[#2D3436] border-[#3D4446] text-gray-200 text-xs h-8"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">结束日期</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-[#2D3436] border-[#3D4446] text-gray-200 text-xs h-8"
            />
          </div>
        </div>

        {/* Keywords */}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">关键词过滤</label>
          <Input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="如：高质量发展、数字经济（留空则不限）"
            className="bg-[#2D3436] border-[#3D4446] text-gray-200 text-xs h-8"
          />
        </div>

        {/* Advanced Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          高级选项
        </button>

        {showAdvanced && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">最低字数</label>
                <Input
                  type="number"
                  value={minWordCount}
                  onChange={(e) => setMinWordCount(parseInt(e.target.value) || 0)}
                  min={0}
                  className="bg-[#2D3436] border-[#3D4446] text-gray-200 text-xs h-8"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">请求间隔 (ms)</label>
                <Input
                  type="number"
                  value={delayMs}
                  onChange={(e) => setDelayMs(parseInt(e.target.value) || 1500)}
                  min={1000}
                  max={5000}
                  step={500}
                  className="bg-[#2D3436] border-[#3D4446] text-gray-200 text-xs h-8"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={dedup}
                onChange={(e) => setDedup(e.target.checked)}
                className="rounded border-[#3D4446]"
              />
              <span className="text-xs text-gray-300">智能去重 (URL + 标题相似度)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoAnalyze}
                onChange={(e) => setAutoAnalyze(e.target.checked)}
                className="rounded border-[#3D4446]"
              />
              <span className="text-xs text-gray-300">采集后自动执行 8 维度 AI 分析</span>
            </label>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleStart}
          disabled={isCollecting || selectedMedia.length === 0}
          className="w-full bg-[#4A90A4] hover:bg-[#5BA1B5] text-white h-9 text-xs"
        >
          {isCollecting ? (
            <>
              <Square className="h-3.5 w-3.5 mr-1.5 animate-pulse" />
              采集中...
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              开始采集
            </>
          )}
        </Button>

        {/* Progress Display */}
        {collectProgress.phase !== "idle" && (
          <div className="space-y-2 pt-2 border-t border-[#3D4446]">
            {/* Progress Bar */}
            {collectProgress.total > 0 && (
              <div className="w-full bg-[#2D3436] rounded-full h-1.5">
                <div
                  className="bg-[#4A90A4] h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round((collectProgress.current / collectProgress.total) * 100)}%`,
                  }}
                />
              </div>
            )}

            {/* Phase & Current */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">
                {collectProgress.phase === "fetching" && "扫描中..."}
                {collectProgress.phase === "collecting" && `采集中 ${collectProgress.current}/${collectProgress.total}`}
                {collectProgress.phase === "analyzing" && "AI分析中..."}
                {collectProgress.phase === "done" && "完成"}
                {collectProgress.phase === "error" && "出错"}
              </span>
              {collectProgress.currentTitle && (
                <span className="text-gray-500 truncate max-w-[200px]">
                  {collectProgress.currentTitle}
                </span>
              )}
            </div>

            {/* Log */}
            {collectProgress.log.length > 0 && (
              <div className="max-h-40 overflow-y-auto bg-[#0D0F10] rounded p-2 font-mono text-[10px] leading-4 text-gray-400">
                {collectProgress.log.slice(-30).map((line, i) => (
                  <div key={i} className={line.startsWith("✓") ? "text-emerald-400" : line.startsWith("跳过") ? "text-yellow-500/70" : line.startsWith("失败") || line.startsWith("入库失败") ? "text-red-400/80" : ""}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
