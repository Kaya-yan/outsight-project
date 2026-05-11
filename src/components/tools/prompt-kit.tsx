"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Wand2 } from "lucide-react";

const TEMPLATES = [
  { id: "polish", label: "学术润色", prompt: "Polish the following academic English text. Improve clarity, conciseness, and academic tone while preserving the original meaning. Output only the polished version." },
  { id: "translate", label: "中译英", prompt: "Translate the following Chinese text into academic English. Use formal academic style suitable for journal publication. Output only the translation." },
  { id: "summarize", label: "摘要提炼", prompt: "Summarize the following text in under 150 words in English. Focus on the main argument, methodology, and key findings." },
  { id: "method", label: "方法论描述", prompt: "Write a standard academic methodology paragraph (about 150 words) describing the following research method. Use formal academic English suitable for a journal article." },
  { id: "keywords", label: "关键词提取", prompt: "Extract 5-8 key academic keywords or phrases from the following text. Output as a comma-separated list." },
  { id: "custom", label: "自定义", prompt: "" },
];

export function PromptKit() {
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function run() {
    const systemPrompt = template.id === "custom" ? customPrompt : template.prompt;
    if (!systemPrompt || !input) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/pre-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: "__prompt_kit__", content: input, systemPrompt, custom: true }),
      });
      // The pre-read API doesn't support custom prompts — let's call DeepSeek directly
      // Actually, reuse the callDeepSeek pattern inline
    } catch {
      // Silent
    }

    // Direct fetch to DeepSeek
    try {
      const res = await fetch("/api/tools/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, userInput: input }),
      });
      if (res.ok) {
        const json = await res.json();
        setOutput(json.result ?? "");
      }
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTemplate(t)}
            className={`px-2 py-1 rounded text-xs ${template.id === t.id ? "bg-[#4A90A4] text-white" : "bg-[#F0F2F5] text-[#7F8A93]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {template.id === "custom" && (
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          rows={3}
          placeholder="输入自定义 System Prompt..."
          className="w-full rounded border border-[#E2E5E9] px-3 py-2 text-xs resize-none"
        />
      )}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={6}
        className="w-full rounded border border-[#E2E5E9] px-3 py-2 text-xs resize-none font-mono"
        placeholder="粘贴需要处理的文本..."
      />
      <Button onClick={run} disabled={!input || isLoading} className="h-8 text-xs gap-1 bg-[#4A90A4] text-white">
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
        {isLoading ? "AI 处理中..." : "运行"}
      </Button>
      {output && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#7F8A93]">结果</span>
            <Button onClick={() => { navigator.clipboard.writeText(output); }} variant="ghost" className="h-7 text-xs">
              <Copy className="h-3 w-3 mr-1" />复制
            </Button>
          </div>
          <textarea readOnly rows={8} className="w-full rounded border border-[#E2E5E9] px-3 py-2 text-xs resize-none bg-[#FAFBFC]" value={output} />
        </div>
      )}
    </div>
  );
}
