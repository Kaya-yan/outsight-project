"use client";

import { useState, useEffect, useRef } from "react";
import { useCodingStore } from "@/stores/coding-store";
import { Card, CardContent } from "@/components/ui/card";
import { Languages, BookOpen, AlertCircle, Loader2, Copy, Check } from "lucide-react";

// ── types ──
interface WordDetail {
  word: string;
  phonetics: { uk?: string; us?: string };
  meanings: Array<{
    partOfSpeech: string;
    definitionsEn: string[];
    definitionsZh: string[];
  }>;
  examples: Array<{ en: string; zh: string }>;
  hasChinese: boolean;
}

type Status = "idle" | "loading" | "paragraph" | "word" | "error" | "invalid";

// ── helpers ──
function isWordLike(text: string): boolean {
  return /^[a-zA-Z'-]+$/.test(text) && text.length > 1 && text.length <= 45;
}

function isParagraphLike(text: string): boolean {
  return text.length > 45 || /\s/.test(text) || /[.,!?;:"]/.test(text);
}

const POS_LABELS: Record<string, string> = {
  noun: "名词",
  verb: "动词",
  adjective: "形容词",
  adverb: "副词",
  preposition: "介词",
  conjunction: "连词",
  interjection: "感叹词",
  pronoun: "代词",
  determiner: "限定词",
  numeral: "数词",
  article: "冠词",
};

export function TranslationAssistant() {
  const selectedText = useCodingStore((s) => s.selectedText);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [sourceText, setSourceText] = useState("");
  const [translated, setTranslated] = useState("");
  const [wordDetail, setWordDetail] = useState<WordDetail | null>(null);

  const [copiedField, setCopiedField] = useState<string>("");

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
      setWordDetail(null);

      if (isWordLike(text)) {
        await lookupWord(text);
      } else if (isParagraphLike(text)) {
        await translateWithDeepSeek(text);
      } else {
        setStatus("invalid");
        setErrorMsg("当前选区无有效英文词汇或句子");
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [selectedText]);

  // ── copy helper ──
  async function copyText(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(""), 1500);
    } catch {
      // clipboard not available — silently ignore
    }
  }

  // ── Paragraph: DeepSeek academic translator ──
  async function translateWithDeepSeek(text: string) {
    setSourceText(text);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error("upstream");
      const data = await res.json();
      if (data.translatedText) {
        setTranslated(data.translatedText);
        setStatus("paragraph");
      } else {
        throw new Error("empty");
      }
    } catch {
      setStatus("error");
      setErrorMsg("翻译服务暂不可用，请稍后重试（使用 DeepSeek 学术翻译引擎）");
    }
  }

  // ── Word: Free Dictionary + DeepSeek definitions ──
  async function lookupWord(word: string) {
    try {
      const res = await fetch("/api/ai/word-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word }),
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) {
        if (res.status === 404) {
          setStatus("error");
          setErrorMsg(`未找到 "${word}" 的词典释义`);
          return;
        }
        throw new Error("upstream");
      }
      const data = await res.json();
      if (data.word) {
        setWordDetail(data as WordDetail);
        setStatus("word");
      } else {
        throw new Error("empty");
      }
    } catch {
      setStatus("error");
      setErrorMsg("词典服务暂不可用，请稍后重试");
    }
  }

  // ── render phonetics row ──
  function renderPhonetics(phonetics: { uk?: string; us?: string }) {
    const hasUk = !!phonetics.uk;
    const hasUs = !!phonetics.us;
    if (!hasUk && !hasUs) return null;

    return (
      <div className="flex items-center gap-4 py-2.5">
        {hasUk && (
          <button
            type="button"
            onClick={() => copyText(phonetics.uk!, "uk")}
            className="flex items-center gap-1.5 group hover:bg-[#F0F2F5] rounded px-1.5 py-0.5 -ml-1.5 transition-colors"
            title="点击复制"
          >
            <span className="text-[10px] font-medium text-[#7F8A93] bg-[#F0F2F5] px-1 rounded select-none">
              UK
            </span>
            <span className="text-xs font-mono text-[#2D3436] select-all">
              {phonetics.uk}
            </span>
            {copiedField === "uk" ? (
              <Check className="h-3 w-3 text-[#5DAD93]" />
            ) : (
              <Copy className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
            )}
          </button>
        )}
        {hasUs && (
          <button
            type="button"
            onClick={() => copyText(phonetics.us!, "us")}
            className="flex items-center gap-1.5 group hover:bg-[#F0F2F5] rounded px-1.5 py-0.5 -ml-1.5 transition-colors"
            title="点击复制"
          >
            <span className="text-[10px] font-medium text-[#7F8A93] bg-[#F0F2F5] px-1 rounded select-none">
              US
            </span>
            <span className="text-xs font-mono text-[#2D3436] select-all">
              {phonetics.us}
            </span>
            {copiedField === "us" ? (
              <Check className="h-3 w-3 text-[#5DAD93]" />
            ) : (
              <Copy className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity" />
            )}
          </button>
        )}
      </div>
    );
  }

  // ── render POS groups ──
  function renderMeanings(
    meanings: WordDetail["meanings"],
    hasChinese: boolean,
  ) {
    if (!meanings || meanings.length === 0) return null;

    const groups: Array<{ pos: string; defs: string[] }> = [];
    for (const m of meanings) {
      const defsToShow = hasChinese && m.definitionsZh.length > 0
        ? m.definitionsZh.slice(0, 3)
        : m.definitionsEn.slice(0, 3);
      if (defsToShow.length === 0) continue;
      groups.push({ pos: m.partOfSpeech, defs: defsToShow });
    }

    if (groups.length === 0) return null;

    return (
      <div className="space-y-2.5 py-2.5">
        {groups.map((g, gi) => (
          <div key={gi}>
            <span className="inline-block text-[10px] font-medium text-[#4A90A4] bg-[#4A90A4]/8 px-1.5 py-0.5 rounded mb-1.5">
              {POS_LABELS[g.pos] ?? g.pos}
            </span>
            <ol className="list-decimal list-inside space-y-0.5">
              {g.defs.map((def, di) => (
                <li
                  key={di}
                  className="text-xs text-[#2D3436] leading-relaxed"
                >
                  {def}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    );
  }

  // ── render example ──
  function renderExample(examples: WordDetail["examples"]) {
    if (!examples || examples.length === 0) return null;
    const ex = examples[0];
    if (!ex.en) return null;

    return (
      <div className="py-2.5 space-y-1.5">
        <p className="text-[10px] text-[#7F8A93] uppercase tracking-wide">
          例句
        </p>
        <p className="text-xs text-[#2D3436] italic leading-relaxed">
          &ldquo;{ex.en}&rdquo;
        </p>
        {ex.zh && (
          <p className="text-xs text-[#7F8A93] leading-relaxed">{ex.zh}</p>
        )}
      </div>
    );
  }

  return (
    <Card className="border-[#E2E5E9] shadow-card">
      <CardContent className="p-3">
        <h3 className="text-xs font-medium text-[#7F8A93] mb-2 flex items-center gap-1.5">
          <Languages className="h-3.5 w-3.5 text-[#4A90A4]" />
          翻译助手
        </h3>

        {status === "loading" && (
          <div className="flex items-center gap-2 py-3 text-xs text-[#95A5A6]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            查询中...
          </div>
        )}

        {(status === "error" || status === "invalid") && (
          <div className="flex items-start gap-2 py-2 text-xs text-[#E67E22] bg-[#E67E22]/5 rounded px-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Paragraph translation result */}
        {status === "paragraph" && translated && (
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            <div className="bg-[#F0F2F5] rounded p-2">
              <p className="text-[10px] text-[#95A5A6] mb-1">原文</p>
              <p className="text-xs text-[#2D3436] leading-relaxed">{sourceText}</p>
            </div>
            <div className="bg-[#4A90A4]/5 rounded p-2 border-l-2 border-[#4A90A4]">
              <p className="text-[10px] text-[#95A5A6] mb-1">DeepSeek 学术翻译</p>
              <p className="text-xs text-[#2D3436] leading-relaxed">{translated}</p>
            </div>
          </div>
        )}

        {/* Word detail */}
        {status === "word" && wordDetail && (() => {
          const phoneticsContent = renderPhonetics(wordDetail.phonetics);
          const meaningsContent = renderMeanings(wordDetail.meanings, wordDetail.hasChinese);
          const exampleContent = renderExample(wordDetail.examples);

          return (
            <div className="max-h-[400px] overflow-y-auto">
              {/* Word title */}
              <h4 className="text-base font-semibold text-[#4A90A4]">
                {wordDetail.word}
              </h4>

              {/* Phonetics row */}
              {phoneticsContent && (
                <>
                  <hr className="border-[#F0F2F5]" />
                  {phoneticsContent}
                </>
              )}

              {/* POS groups */}
              {meaningsContent && (
                <>
                  <hr className="border-[#F0F2F5]" />
                  {meaningsContent}
                </>
              )}

              {/* Example */}
              {exampleContent && (
                <>
                  <hr className="border-[#F0F2F5]" />
                  {exampleContent}
                </>
              )}
            </div>
          );
        })()}

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
