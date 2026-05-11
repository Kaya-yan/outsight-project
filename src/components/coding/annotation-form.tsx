"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { CodingNode } from "@/types/database";

interface AnnotationFormProps {
  node: CodingNode;
  quoteText?: string;
  existingConfidence?: number;
  existingNote?: string;
  onSubmit: (data: { node_id: string; quote_text?: string; confidence: number; note?: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function AnnotationForm({
  node,
  quoteText,
  existingConfidence,
  existingNote,
  onSubmit,
  onCancel,
  isSubmitting,
}: AnnotationFormProps) {
  const [quote, setQuote] = useState(quoteText ?? "");
  const [confidence, setConfidence] = useState(existingConfidence ?? 3);
  const [note, setNote] = useState(existingNote ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      node_id: node.id,
      quote_text: quote.trim() || undefined,
      confidence,
      note: note.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2">
        <span
          className="block w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: node.color ?? "#4A90A4" }}
        />
        <span className="text-sm font-medium text-[#2D3436]">{node.label}</span>
        <span className="text-xs text-[#95A5A6]">{node.code}</span>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">引用文本</Label>
        <textarea
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          rows={3}
          className="flex w-full rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4] resize-none"
          placeholder="从左侧选择文本，或手动输入..."
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">置信度</Label>
          <span className="text-xs font-mono text-[#4A90A4]">{confidence} / 5</span>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          value={confidence}
          onChange={(e) => setConfidence(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none bg-[#E2E5E9] accent-[#4A90A4] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-[#95A5A6]">
          <span>很低</span>
          <span>很高</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">备注</Label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="flex w-full rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4] resize-none"
          placeholder="可选备注..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className="h-8 text-xs">
          取消
        </Button>
        <Button type="submit" disabled={isSubmitting} className="h-8 text-xs bg-[#4A90A4] text-white">
          {isSubmitting ? "保存中..." : "提交标注"}
        </Button>
      </div>
    </form>
  );
}
