import { create } from "zustand";

// ── Types ──

export interface WordFreqEntry {
  word: string;
  freq: number;
  percentage: number;
}

export interface NgramEntry {
  ngram: string;
  freq: number;
}

export interface StyleStats {
  totalTokens: number;
  totalSentences: number;
  avgWordLength: number;
  avgSentenceLength: number;
  lexicalDensity: number;
  ttr: number;
  hapaxPercentage: number;
}

export interface CollocationEntry {
  word: string;
  freq: number;
  mi: number;
  tScore: number;
}

export interface KWICEntry {
  left: string;
  node: string;
  right: string;
  sentence: number;
  position: number;
}

interface LinguisticsState {
  // Input
  selectedIds: string[];
  rawText: string;

  // Results
  styleStats: StyleStats | null;
  topWords: WordFreqEntry[];
  bigrams: NgramEntry[];
  trigrams: NgramEntry[];
  quadgrams: NgramEntry[];
  collocations: CollocationEntry[];
  concordance: KWICEntry[];
  nodeWord: string;

  // UI
  isLoading: boolean;
  activeTab: "frequency" | "ngrams" | "collocation" | "kwic" | "style";
  error: string | null;

  // Actions
  setSelectedIds: (ids: string[]) => void;
  setRawText: (text: string) => void;
  setActiveTab: (tab: LinguisticsState["activeTab"]) => void;
  runFullAnalysis: () => Promise<void>;
  runCollocation: (nodeWord: string, span?: number) => Promise<void>;
  runKWIC: (nodeWord: string, contextSize?: number) => Promise<void>;
  clear: () => void;
}

export const useLinguisticsStore = create<LinguisticsState>((set, get) => ({
  selectedIds: [],
  rawText: "",
  styleStats: null,
  topWords: [],
  bigrams: [],
  trigrams: [],
  quadgrams: [],
  collocations: [],
  concordance: [],
  nodeWord: "",
  isLoading: false,
  activeTab: "frequency",
  error: null,

  setSelectedIds: (ids) => set({ selectedIds: ids }),
  setRawText: (text) => set({ rawText: text }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  runFullAnalysis: async () => {
    const { selectedIds, rawText } = get();
    if (selectedIds.length === 0 && !rawText) {
      set({ error: "请选择文章或输入文本" });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/linguistics/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleIds: selectedIds.length > 0 ? selectedIds : undefined,
          text: selectedIds.length === 0 ? rawText : undefined,
          mode: "full",
        }),
      });
      const json = await res.json();
      if (res.ok) {
        set({
          styleStats: json.styleStats,
          topWords: json.topWords,
          bigrams: json.bigrams,
          trigrams: json.trigrams,
          quadgrams: json.quadgrams,
        });
      } else {
        set({ error: json.error ?? "分析失败" });
      }
    } catch {
      set({ error: "网络连接失败" });
    } finally {
      set({ isLoading: false });
    }
  },

  runCollocation: async (nodeWord, span) => {
    const { selectedIds, rawText } = get();
    set({ isLoading: true, error: null, nodeWord });
    try {
      const res = await fetch("/api/linguistics/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleIds: selectedIds.length > 0 ? selectedIds : undefined,
          text: selectedIds.length === 0 ? rawText : undefined,
          mode: "collocation",
          nodeWord,
          span: span ?? 5,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        set({ collocations: json.collocations });
      } else {
        set({ error: json.error ?? "分析失败" });
      }
    } catch {
      set({ error: "网络连接失败" });
    } finally {
      set({ isLoading: false });
    }
  },

  runKWIC: async (nodeWord, contextSize) => {
    const { selectedIds, rawText } = get();
    set({ isLoading: true, error: null, nodeWord });
    try {
      const res = await fetch("/api/linguistics/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleIds: selectedIds.length > 0 ? selectedIds : undefined,
          text: selectedIds.length === 0 ? rawText : undefined,
          mode: "kwic",
          nodeWord,
          contextSize: contextSize ?? 5,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        set({ concordance: json.concordance });
      } else {
        set({ error: json.error ?? "分析失败" });
      }
    } catch {
      set({ error: "网络连接失败" });
    } finally {
      set({ isLoading: false });
    }
  },

  clear: () => set({
    selectedIds: [],
    rawText: "",
    styleStats: null,
    topWords: [],
    bigrams: [],
    trigrams: [],
    quadgrams: [],
    collocations: [],
    concordance: [],
    nodeWord: "",
    error: null,
  }),
}));
