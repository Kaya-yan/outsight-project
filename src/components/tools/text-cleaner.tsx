"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function TextCleaner() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [stats, setStats] = useState<{ before: number; after: number; removed: number } | null>(null);

  function clean() {
    let text = input;
    // Remove HTML tags
    text = text.replace(/<[^>]*>/g, " ");
    // Remove URLs
    text = text.replace(/https?:\/\/\S+/g, "");
    // Remove email addresses
    text = text.replace(/\S+@\S+\.\S+/g, "");
    // Collapse whitespace
    text = text.replace(/&nbsp;/g, " ");
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&quot;/g, '"');
    // Remove multiple spaces/newlines
    text = text.replace(/[ \t]+/g, " ");
    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.trim();

    setOutput(text);
    setStats({
      before: input.length,
      after: text.length,
      removed: input.length - text.length,
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={8}
        className="w-full rounded border border-[#E2E5E9] px-3 py-2 text-xs resize-none font-mono"
        placeholder="粘贴含 HTML 标签、广告链接的文本..."
      />
      <Button onClick={clean} disabled={!input} className="h-8 text-xs gap-1 bg-[#4A90A4] text-white">
        <Sparkles className="h-3.5 w-3.5" /> 一键净化
      </Button>
      {stats && (
        <div className="flex gap-4 text-xs text-[#7F8A93]">
          <span>清洗前：{stats.before} 字符</span>
          <span>清洗后：{stats.after} 字符</span>
          <span className="text-[#5DAD93]">移除：{stats.removed} 字符</span>
        </div>
      )}
      {output && (
        <textarea readOnly rows={8} className="w-full rounded border border-[#E2E5E9] px-3 py-2 text-xs resize-none bg-[#FAFBFC] font-mono" value={output} />
      )}
    </div>
  );
}
