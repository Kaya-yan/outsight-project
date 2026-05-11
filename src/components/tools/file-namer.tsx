"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MEDIA_OUTLETS } from "@/lib/constants";
import { Copy, FileText } from "lucide-react";

export function FileNamer() {
  const [media, setMedia] = useState("NYT");
  const [date, setDate] = useState("");
  const [startNum, setStartNum] = useState(1);
  const [endNum, setEndNum] = useState(1);
  const [results, setResults] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  function generate() {
    const d = date.replace(/-/g, "");
    const names: string[] = [];
    for (let i = startNum; i <= Math.min(endNum, startNum + 100); i++) {
      names.push(`${media}_${d}_${String(i).padStart(3, "0")}.txt`);
    }
    setResults(names);
  }

  function copyAll() {
    navigator.clipboard.writeText(results.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">媒体</label>
          <select value={media} onChange={(e) => setMedia(e.target.value)}
            className="h-9 w-full rounded border border-[#E2E5E9] bg-white px-3 text-sm">
            {MEDIA_OUTLETS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">日期</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">起始编号</label>
          <Input type="number" min={1} value={startNum} onChange={(e) => setStartNum(Number(e.target.value))} className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">结束编号</label>
          <Input type="number" min={1} value={endNum} onChange={(e) => setEndNum(Number(e.target.value))} className="h-9 text-sm" />
        </div>
      </div>
      <Button onClick={generate} disabled={!date} className="h-8 text-xs bg-[#4A90A4] text-white">
        <FileText className="h-3.5 w-3.5 mr-1" /> 生成
      </Button>
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#7F8A93]">共 {results.length} 个文件</span>
            <Button onClick={copyAll} variant="ghost" className="h-7 text-xs"><Copy className="h-3 w-3 mr-1" />{copied ? "已复制" : "一键复制"}</Button>
          </div>
          <textarea readOnly rows={Math.min(results.length, 10)} className="w-full rounded border border-[#E2E5E9] px-3 py-2 text-xs resize-none bg-[#FAFBFC] font-mono" value={results.join("\n")} />
        </div>
      )}
    </div>
  );
}
