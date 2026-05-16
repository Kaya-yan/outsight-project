"use client";

import { useState, useEffect, useRef } from "react";
import { useCodingStore } from "@/stores/coding-store";
import { Card, CardContent } from "@/components/ui/card";
import { Languages, BookOpen, AlertCircle, Loader2 } from "lucide-react";

// ── Free APIs ──
const TRANSLATE_URL = "https://translate.argosopentech.com/translate";
const DICT_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";

interface DictEntry {
  word: string;
  phonetic?: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{ definition: string; example?: string }>;
  }>;
}

interface TranslationResult {
  translatedText: string;
}

// ── helpers ──
function isWord(text: string): boolean {
  return /^[a-zA-Z]+$/.test(text) && text.length > 1 && text.length <= 45;
}
function isParagraph(text: string): boolean {
  return /\s/.test(text) || text.length > 45;
}

export function TranslationAssistant() {
  const selectedText = useCodingStore((s) => s.selectedText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paragraph mode
  const [sourceText, setSourceText] = useState("");
  const [translated, setTranslated] = useState("");

  // Word mode
  const [word, setWord] = useState("");
  const [entries, setEntries] = useState<DictEntry[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const text = selectedText?.trim();
    if (!text || text.length === 0) return;

    // Debounce 350ms
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // Reset
      setError(null);
      setSourceText("");
      setTranslated("");
      setWord("");
      setEntries([]);

      if (isWord(text)) {
        // ── word lookup ──
        setLoading(true);
        setWord(text);
        try {
          const res = await fetch(`${DICT_URL}/${encodeURIComponent(text)}`);
          if (!res.ok) throw new Error("not found");
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setEntries(data as DictEntry[]);
          } else {
            setError(`未找到 "${text}" 的释义`);
          }
        } catch {
          setError(`词典服务暂不可用，请稍后重试`);
        } finally {
          setLoading(false);
        }
      } else if (isParagraph(text)) {
        // ── paragraph translation ──
        setLoading(true);
        setSourceText(text);
        try {
          const res = await fetch(TRANSLATE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q: text, source: "en", target: "zh", format: "text" }),
          });
          if (!res.ok) throw new Error("translate failed");
          const data: TranslationResult = await res.json();
          setTranslated(data.translatedText || "");
        } catch {
          setError("翻译服务暂不可用，请稍后重试");
        } finally {
          setLoading(false);
        }
      } else {
        // ── invalid ──
        setError("当前选区无有效词汇或句子（仅支持英文单词或段落）");
      }
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [selectedText]);

  const hasResult = !!translated || entries.length > 0;

  return (
    <Card className="border-[#E2E5E9] shadow-card">
      <CardContent className="p-3">
        <h3 className="text-xs font-medium text-[#7F8A93] mb-2 flex items-center gap-1.5">
          <Languages className="h-3.5 w-3.5 text-[#4A90A4]" />
          翻译助手
        </h3>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 py-3 text-xs text-[#95A5A6]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            查询中...
          </div>
        )}

        {/* Error / invalid */}
        {!loading && error && !hasResult && (
          <div className="flex items-start gap-2 py-2 text-xs text-[#E67E22] bg-[#E67E22]/5 rounded px-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Paragraph translation result */}
        {!loading && translated && (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            <div className="bg-[#F0F2F5] rounded p-2">
              <p className="text-[10px] text-[#95A5A6] mb-1">原文</p>
              <p className="text-xs text-[#2D3436] leading-relaxed">{sourceText}</p>
            </div>
            <div className="bg-[#4A90A4]/5 rounded p-2 border-l-2 border-[#4A90A4]">
              <p className="text-[10px] text-[#95A5A6] mb-1">译文</p>
              <p className="text-xs text-[#2D3436] leading-relaxed">{translated}</p>
            </div>
          </div>
        )}

        {/* Word lookup result */}
        {!loading && entries.length > 0 && (
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {/* Word + phonetic */}
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-[#2D3436]">{entries[0].word}</span>
              {entries[0].phonetic && (
                <span className="text-xs text-[#95A5A6] font-mono">{entries[0].phonetic}</span>
              )}
            </div>

            {/* Meanings */}
            {entries[0].meanings?.slice(0, 3).map((m, mi) => (
              <div key={mi} className="bg-[#FAFBFC] rounded p-2 border border-[#F0F2F5]">
                <span className="text-[10px] text-[#4A90A4] font-medium bg-[#4A90A4]/8 px-1.5 py-0.5 rounded">
                  {m.partOfSpeech}
                </span>
                {m.definitions?.slice(0, 2).map((d, di) => (
                  <div key={di} className="mt-1.5">
                    <p className="text-xs text-[#2D3436]">{d.definition}</p>
                    {d.example && (
                      <p className="text-[11px] text-[#95A5A6] italic mt-0.5">
                        &ldquo;{d.example}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Idle placeholder */}
        {!loading && !error && !hasResult && (
          <p className="text-xs text-[#95A5A6] py-2">
            <BookOpen className="h-3.5 w-3.5 inline mr-1 opacity-50" />
            选中原文中的文字或单词即可翻译
          </p>
        )}
      </CardContent>
    </Card>
  );
}
