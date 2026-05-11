"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Calendar } from "lucide-react";

type SplitMode = "year" | "quarter" | "halfyear";

export function PeriodSplitter() {
  const [start, setStart] = useState("2022-10-01");
  const [end, setEnd] = useState("2024-12-31");
  const [mode, setMode] = useState<SplitMode>("quarter");
  const [results, setResults] = useState<string[]>([]);

  function split() {
    const s = new Date(start);
    const e = new Date(end);
    const chunks: string[] = [];
    let current = new Date(s);

    while (current < e) {
      const chunkStart = new Date(current);
      let chunkEnd: Date;

      switch (mode) {
        case "year":
          chunkEnd = new Date(chunkStart.getFullYear() + 1, 0, 1);
          break;
        case "quarter":
          chunkEnd = new Date(chunkStart.getFullYear(), chunkStart.getMonth() + 3, 1);
          break;
        case "halfyear":
          chunkEnd = new Date(chunkStart.getFullYear(), chunkStart.getMonth() + 6, 1);
          break;
      }

      if (chunkEnd > e) chunkEnd = e;
      chunks.push(
        `${chunkStart.getFullYear()}.${String(chunkStart.getMonth() + 1).padStart(2, "0")}-${chunkEnd.getFullYear()}.${String(chunkEnd.getMonth() + 1).padStart(2, "0")}`,
      );
      current = chunkEnd;
    }

    setResults(chunks);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">起始日期</label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">结束日期</label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>
      <div className="flex gap-2">
        {(["year", "quarter", "halfyear"] as SplitMode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`px-2 py-1 rounded text-xs ${
            mode === m ? "bg-[#4A90A4] text-white" : "bg-[#F0F2F5] text-[#7F8A93]"
          }`}>
            {m === "year" ? "按年" : m === "quarter" ? "按季度" : "按半年"}
          </button>
        ))}
      </div>
      <Button onClick={split} className="h-8 text-xs bg-[#4A90A4] text-white">
        <Calendar className="h-3.5 w-3.5 mr-1" /> 切分
      </Button>
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#7F8A93]">共 {results.length} 个时段</span>
            <Button onClick={() => navigator.clipboard.writeText(results.join("\n"))} variant="ghost" className="h-7 text-xs">
              <Copy className="h-3 w-3 mr-1" />复制
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {results.map((r) => (
              <span key={r} className="text-xs font-mono bg-[#F0F2F5] rounded px-1.5 py-0.5">{r}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
