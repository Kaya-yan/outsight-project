"use client";

import { useState, useEffect, useRef } from "react";
import { useCodingStore } from "@/stores/coding-store";
import { Card, CardContent } from "@/components/ui/card";
import { Languages, BookOpen, AlertCircle, Loader2 } from "lucide-react";

const DICT_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";

interface DictEntry {
  word: string;
  phonetic?: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{ definition: string; example?: string }>;
  }>;
}

type Status = "idle" | "loading" | "paragraph" | "word" | "error" | "invalid";

function isWordLike(text: string): boolean {
  return /^[a-zA-Z'-]+$/.test(text) && text.length > 1 && text.length <= 45;
}

function isParagraphLike(text: string): boolean {
  return text.length > 45 || /\s/.test(text) || /[.,!?;:"]/.test(text);
}

export function TranslationAssistant() {
  const selectedText = useCodingStore((s) => s.selectedText);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Paragraph mode
  const [sourceText, setSourceText] = useState("");
  const [translated, setTranslated] = useState("");

  // Word mode
  const [entries, setEntries] = useState<DictEntry[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const lastTextRef = useRef("");

  useEffect(() => {
    const text = selectedText?.trim();
    if (!text || text.length === 0 || text === lastTextRef.current) return;
    lastTextRef.current = text;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setStatus("loading");
      setErrorMsg("");
      setSourceText("");
      setTranslated("");
      setEntries([]);

      if (isWordLike(text)) {
        await lookupWord(text);
      } else if (isParagraphLike(text)) {
        await translateParagraph(text);
      } else {
        setStatus("invalid");
        setErrorMsg("当前选区无有效英文词汇或句子（包含非英文字符或无法识别）");
      }
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [selectedText]);

  async function translateParagraph(text: string) {
    setSourceText(text);

    // Try direct API first (may fail with CORS on some networks)
    let ok = await tryDirectTranslate(text);
    if (!ok) {
      // Fall back to backend proxy
      ok = await tryProxyTranslate(text);
    }
    if (!ok) {
      setStatus("error");
      setErrorMsg("翻译服务暂不可用，请稍后重试（已尝试直连与代理两种方式）");
    }
  }

  async function tryDirectTranslate(text: string): Promise<boolean> {
    try {
      const res = await fetch("https://translate.argosopentech.com/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: "en", target: "zh", format: "text" }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.translatedText) {
        setTranslated(data.translatedText);
        setStatus("paragraph");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function tryProxyTranslate(text: string): Promise<boolean> {
    try {
      const res = await fetch("/api/tools/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: text, source: "en", target: "zh" }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.translatedText) {
        setTranslated(data.translatedText);
        setStatus("paragraph");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function lookupWord(word: string) {
    try {
      const res = await fetch(`${DICT_URL}/${encodeURIComponent(word)}`);
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setEntries(data as DictEntry[]);
        setStatus("word");
      } else {
        setStatus("error");
        setErrorMsg(`未找到 "${word}" 的词典释义`);
      }
    } catch {
      setStatus("error");
      setErrorMsg("词典服务暂不可用，请稍后重试");
    }
  }

  return (
    <Card className="border-[#E2E5E9] shadow-card">
      <CardContent className="p-3">
        <h3 className="text-xs font-medium text-[#7F8A93] mb-2 flex items-center gap-1.5">
          <Languages className="h-3.5 w-3.5 text-[#4A90A4]" />
          翻译助手
        </h3>

        {/* Loading */}
        {status === "loading" && (
          <div className="flex items-center gap-2 py-3 text-xs text-[#95A5A6]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            查询中...
          </div>
        )}

        {/* Error / invalid */}
        {(status === "error" || status === "invalid") && (
          <div className="flex items-start gap-2 py-2 text-xs text-[#E67E22] bg-[#E67E22]/5 rounded px-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Paragraph result */}
        {status === "paragraph" && translated && (
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
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

        {/* Word result */}
        {status === "word" && entries.length > 0 && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-[#2D3436]">{entries[0].word}</span>
              {entries[0].phonetic && (
                <span className="text-xs text-[#95A5A6] font-mono">{entries[0].phonetic}</span>
              )}
            </div>
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

        {/* Idle */}
        {status === "idle" && (
          <p className="text-xs text-[#95A5A6] py-2">
            <BookOpen className="h-3.5 w-3.5 inline mr-1 opacity-50" />
            选中原文中的单词或句子即可翻译
          </p>
        )}
      </CardContent>
    </Card>
  );
}
