import { create } from "zustand";
import type { Article } from "@/types/database";

interface ArticleListFilters {
  media?: string;
  period?: string;
  status?: string;
  search?: string;
}

interface ArticleStoreState {
  filters: ArticleListFilters;
  page: number;
  pageSize: number;
  total: number;
  selectedIds: string[];
  articles: Article[];
  isLoading: boolean;
  error: string | null;

  setFilter: (key: keyof ArticleListFilters, value: string | undefined) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  fetchArticles: () => Promise<void>;
}

function buildQuery(filters: ArticleListFilters, page: number, pageSize: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (filters.media) params.set("media", filters.media);
  if (filters.period) params.set("period", filters.period);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  return `/api/articles?${params.toString()}`;
}

export const useArticleStore = create<ArticleStoreState>((set, get) => ({
  filters: {},
  page: 1,
  pageSize: 20,
  total: 0,
  selectedIds: [],
  articles: [],
  isLoading: false,
  error: null,

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

  setPageSize: (pageSize) => {
    set({ pageSize, page: 1, selectedIds: [] });
    get().fetchArticles();
  },

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
}));
