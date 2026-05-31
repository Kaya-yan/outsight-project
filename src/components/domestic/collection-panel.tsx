"use client";

import { useState, useMemo } from "react";
import { useDomesticStore } from "@/stores/domestic-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MEDIA_ADAPTERS } from "@/lib/domestic/media-adapters";
import { Play, Search, X, ChevronDown, ChevronUp, AlertCircle, RotateCcw } from "lucide-react";

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");

  const filteredAdapters = useMemo(() => {
    if (!mediaSearch) return MEDIA_ADAPTERS;
    return MEDIA_ADAPTERS.filter((a) => a.name.includes(mediaSearch));
  }, [mediaSearch]);

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
    });
  };

  return (
    <Card className="border-[#E2E5E9]">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[#2D3436]">采集面板</h3>
          <span className="text-xs text-[#7F8A93]">自动去重 · 间隔 1.2s</span>
        </div>

        {/* Media Multi-Select with search */}
        <div>
          <label className="text-xs text-[#7F8A93] mb-1.5 block">媒体源</label>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#95A5A6]" />
            <Input
              value={mediaSearch}
              onChange={(e) => setMediaSearch(e.target.value)}
              placeholder="搜索媒体..."
              className="h-7 pl-7 pr-7 text-xs border-[#E2E5E9] bg-white"
            />
            {mediaSearch && (
              <button onClick={() => setMediaSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#95A5A6] hover:text-[#2D3436]">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filteredAdapters.map((adapter) => {
              const selected = selectedMedia.includes(adapter.id);
              return (
                <button
                  key={adapter.id}
                  onClick={() => toggleMedia(adapter.id)}
                  className={`
                    px-2.5 py-1 text-xs rounded border transition-colors
                    ${selected
                      ? "bg-[#4A90A4]/10 border-[#4A90A4] text-[#4A90A4]"
                      : "bg-white border-[#E2E5E9] text-[#7F8A93] hover:border-[#4A90A4]"
                    }
                  `}
                >
                  {adapter.name}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <button onClick={() => setSelectedMedia(MEDIA_ADAPTERS.map((a) => a.id))} className="text-[10px] text-[#4A90A4] hover:underline">全选</button>
            <button onClick={() => setSelectedMedia([])} className="text-[10px] text-[#95A5A6] hover:underline">清空</button>
            <span className="text-[10px] text-[#95A5A6]">已选 {selectedMedia.length}/{MEDIA_ADAPTERS.length}</span>
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#7F8A93] mb-1 block">起始日期</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs border-[#E2E5E9] bg-white" />
          </div>
          <div>
            <label className="text-xs text-[#7F8A93] mb-1 block">结束日期</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs border-[#E2E5E9] bg-white" />
          </div>
        </div>

        {/* Keywords */}
        <div>
          <label className="text-xs text-[#7F8A93] mb-1 block">关键词过滤</label>
          <Input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="如：高质量发展（留空则不限）"
            className="h-8 text-xs border-[#E2E5E9] bg-white"
          />
        </div>

        {/* Advanced */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-[#7F8A93] hover:text-[#2D3436] transition-colors"
        >
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          高级选项
        </button>

        {showAdvanced && (
          <div className="pt-1">
            <label className="text-xs text-[#7F8A93] mb-1 block">最低字数</label>
            <Input
              type="number"
              value={minWordCount}
              onChange={(e) => setMinWordCount(parseInt(e.target.value) || 0)}
              min={0}
              className="h-8 text-xs border-[#E2E5E9] bg-white w-32"
            />
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleStart}
          disabled={isCollecting || selectedMedia.length === 0}
          className="w-full bg-[#4A90A4] hover:bg-[#3D7D8F] text-white h-9 text-sm gap-1.5"
        >
          {isCollecting ? (
            <>
              <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              采集中...
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              开始采集
            </>
          )}
        </Button>

        {/* Progress Display */}
        {collectProgress.phase !== "idle" && (
          <div className="space-y-2 pt-3 border-t border-[#E2E5E9]">
            {/* Progress Bar */}
            {collectProgress.total > 0 && (
              <div className="w-full bg-[#E2E5E9] rounded-full h-2">
                <div
                  className="h-full bg-[#4A90A4] rounded-full transition-all duration-300"
                  style={{ width: `${Math.round((collectProgress.current / collectProgress.total) * 100)}%` }}
                />
              </div>
            )}

            {/* Phase & Current */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#2D3436] font-medium">
                {collectProgress.phase === "fetching" && "扫描中..."}
                {collectProgress.phase === "collecting" && `采集中 ${collectProgress.current}/${collectProgress.total}`}
                {collectProgress.phase === "done" && "完成"}
                {collectProgress.phase === "error" && "出错"}
              </span>
              <div className="flex items-center gap-2">
                {collectProgress.phase === "error" && !isCollecting && (
                  <button
                    onClick={handleStart}
                    className="flex items-center gap-1 text-xs text-[#4A90A4] hover:text-[#3D7D8F] transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    重试
                  </button>
                )}
                {collectProgress.currentTitle && (
                  <span className="text-[#7F8A93] truncate max-w-[200px]">{collectProgress.currentTitle}</span>
                )}
              </div>
            </div>

            {/* Log */}
            {collectProgress.log.length > 0 && (
              <div className="max-h-32 overflow-y-auto bg-[#F0F2F5] rounded p-2 font-mono text-[10px] leading-4 text-[#7F8A93]">
                {collectProgress.log.slice(-25).map((line, i) => (
                  <div key={i} className={
                    line.startsWith("✓") ? "text-emerald-600" :
                    line.startsWith("  失败") || line.startsWith("  入库失败") ? "text-[#E67E22]" :
                    ""
                  }>
                    {line}
                  </div>
                ))}
              </div>
            )}

            {/* Errors (expandable) */}
            {collectProgress.errors.length > 0 && (
              <div>
                <button
                  onClick={() => setShowErrors(!showErrors)}
                  className="flex items-center gap-1 text-xs text-[#E67E22] hover:underline"
                >
                  <AlertCircle className="h-3 w-3" />
                  {collectProgress.errors.length} 篇失败 {showErrors ? "▲" : "▼"}
                </button>
                {showErrors && (
                  <div className="mt-1 space-y-1 max-h-24 overflow-y-auto">
                    {collectProgress.errors.map((err, i) => (
                      <div key={i} className="text-[10px] flex items-start gap-2 p-1.5 bg-[#f59e0b]/5 rounded">
                        <span className="text-[#2D3436] flex-1 truncate">{err.title}</span>
                        <span className="text-[#E67E22] shrink-0">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            {collectProgress.summary && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-4 text-xs p-2 bg-[#4A90A4]/5 rounded">
                  <span className="text-emerald-600 font-medium">成功 {collectProgress.summary.collected}</span>
                  <span className="text-[#7F8A93]">跳过 {collectProgress.summary.skipped}</span>
                  <span className="text-[#E67E22]">失败 {collectProgress.summary.failed}</span>
                </div>
                {collectProgress.summary.skipReasons && Object.keys(collectProgress.summary.skipReasons).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    {Object.entries(collectProgress.summary.skipReasons).map(([reason, count]) => (
                      <span key={reason} className="px-1.5 py-0.5 bg-[#f59e0b]/5 text-[#E67E22] rounded">
                        {reason}: {count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
