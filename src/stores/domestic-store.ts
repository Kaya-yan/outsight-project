import { create } from "zustand";

// ── Types ──

export interface DomesticArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  media: string;
  source_type: string;
  publish_date: string;
  full_text: string;
  content: string;
  word_count: number;
  author: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DomesticFilters {
  media?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  sourceType?: string;
  sentiment?: string;
  hasAiAnalysis?: boolean;
  search?: string;
}

export interface CollectProgress {
  phase: "idle" | "fetching" | "collecting" | "analyzing" | "done" | "error";
  current: number;
  total: number;
  currentTitle: string;
  log: string[];
}

export interface DomesticStats {
  totalArticles: number;
  mediaDistribution: { media: string; count: number }[];
  dateDistribution: { date: string; count: number }[];
  avgWordCount: number;
  sentimentDistribution: { polarity: string; count: number }[];
  topWords: { word: string; count: number }[];
}

// ── Store ──

interface DomesticStoreState {
  // List
  articles: DomesticArticle[];
  total: number;
  page: number;
  pageSize: number;
  filters: DomesticFilters;
  isLoading: boolean;
  error: string | null;

  // Selection
  selectedIds: string[];

  // Collection
  collectProgress: CollectProgress;
  isCollecting: boolean;

  // Detail
  activeArticle: DomesticArticle | null;
  isLoadingDetail: boolean;

  // Stats
  stats: DomesticStats | null;
  isLoadingStats: boolean;

  // Actions — list
  setFilter: (key: keyof DomesticFilters, value: string | boolean | undefined) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  fetchArticles: () => Promise<void>;

  // Actions — selection
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Actions — collection
  startCollect: (params: {
    mediaIds: string[];
    dateFrom: string;
    dateTo: string;
    keywords?: string;
    sections?: string[];
    minWordCount?: number;
    sourceType?: string;
    dedup: boolean;
    delayMs: number;
    autoAnalyze: boolean;
  }) => Promise<void>;

  // Actions — detail
  fetchArticle: (id: string) => Promise<void>;
  clearActiveArticle: () => void;
  triggerAnalysis: (id: string) => Promise<void>;

  // Actions — stats
  fetchStats: (dateFrom?: string, dateTo?: string) => Promise<void>;
}

function buildQuery(filters: DomesticFilters, page: number, pageSize: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (filters.media) params.set("media", filters.media);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.sourceType) params.set("sourceType", filters.sourceType);
  if (filters.search) params.set("search", filters.search);
  if (filters.hasAiAnalysis) params.set("hasAiAnalysis", "true");
  return `/api/domestic/articles?${params.toString()}`;
}

export const useDomesticStore = create<DomesticStoreState>((set, get) => ({
  // Initial state
  articles: [],
  total: 0,
  page: 1,
  pageSize: 20,
  filters: {},
  isLoading: false,
  error: null,
  selectedIds: [],
  collectProgress: { phase: "idle", current: 0, total: 0, currentTitle: "", log: [] },
  isCollecting: false,
  activeArticle: null,
  isLoadingDetail: false,
  stats: null,
  isLoadingStats: false,

  // ── List ──
  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value }, page: 1, selectedIds: [] }));
    get().fetchArticles();
  },

  resetFilters: () => {
    set({ filters: {}, page: 1, selectedIds: [] });
    get().fetchArticles();
  },

  setPage: (page) => {
    set({ page, selectedIds: [] });
    get().fetchArticles();
  },

  fetchArticles: async () => {
    const { filters, page, pageSize } = get();
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(buildQuery(filters, page, pageSize));
      const json = await res.json();
      if (res.ok) {
        set({ articles: json.data ?? [], total: json.total ?? 0 });
      } else {
        set({ error: json.error ?? "加载失败" });
      }
    } catch {
      set({ error: "网络连接失败" });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Selection ──
  toggleSelect: (id) => {
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((i) => i !== id)
        : [...s.selectedIds, id],
    }));
  },

  selectAll: () => {
    set((s) => ({ selectedIds: s.articles.map((a) => a.id) }));
  },

  clearSelection: () => set({ selectedIds: [] }),

  // ── Collection ──
  startCollect: async (params) => {
    set({
      isCollecting: true,
      collectProgress: { phase: "fetching", current: 0, total: 0, currentTitle: "", log: [] },
    });

    try {
      const res = await fetch("/api/domestic/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const json = await res.json();
        set({
          isCollecting: false,
          collectProgress: {
            phase: "error",
            current: 0,
            total: 0,
            currentTitle: "",
            log: [json.error || "采集失败"],
          },
        });
        return;
      }

      // Read SSE stream for progress
      const reader = res.body?.getReader();
      if (!reader) {
        set({ isCollecting: false });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            set((s) => ({
              collectProgress: {
                phase: evt.phase ?? s.collectProgress.phase,
                current: evt.current ?? s.collectProgress.current,
                total: evt.total ?? s.collectProgress.total,
                currentTitle: evt.currentTitle ?? s.collectProgress.currentTitle,
                log: evt.log
                  ? [...s.collectProgress.log, evt.log]
                  : s.collectProgress.log,
              },
            }));
          } catch { /* ignore malformed SSE */ }
        }
      }

      set((s) => ({
        isCollecting: false,
        collectProgress: { ...s.collectProgress, phase: "done" },
      }));

      // Refresh list
      get().fetchArticles();
    } catch {
      set({
        isCollecting: false,
        collectProgress: {
          phase: "error",
          current: 0,
          total: 0,
          currentTitle: "",
          log: ["网络连接失败"],
        },
      });
    }
  },

  // ── Detail ──
  fetchArticle: async (id) => {
    set({ isLoadingDetail: true, activeArticle: null });
    try {
      const res = await fetch(`/api/domestic/articles/${id}`);
      const json = await res.json();
      if (res.ok) {
        set({ activeArticle: json.data });
      } else {
        set({ error: json.error ?? "加载失败" });
      }
    } catch {
      set({ error: "网络连接失败" });
    } finally {
      set({ isLoadingDetail: false });
    }
  },

  clearActiveArticle: () => set({ activeArticle: null }),

  triggerAnalysis: async (id) => {
    set({ isLoadingDetail: true });
    try {
      const res = await fetch(`/api/domestic/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: id }),
      });
      const json = await res.json();
      if (res.ok) {
        // Re-fetch article to get updated metadata
        get().fetchArticle(id);
      } else {
        set({ error: json.error ?? "分析失败" });
      }
    } catch {
      set({ error: "网络连接失败" });
    } finally {
      set({ isLoadingDetail: false });
    }
  },

  // ── Stats ──
  fetchStats: async (dateFrom, dateTo) => {
    set({ isLoadingStats: true });
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/domestic/stats?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        set({ stats: json });
      }
    } catch {
      // silent
    } finally {
      set({ isLoadingStats: false });
    }
  },
}));
