import { create } from "zustand";
import type { LiteratureNote } from "@/types/database";

interface LitStoreState {
  notes: LiteratureNote[];
  total: number;
  isLoading: boolean;
  stats: {
    total: number; forReview: number; byTag: Record<string, number>;
    byContributor: Record<string, number>; byRating: Record<string, number>; avgRating: number;
  } | null;

  loadNotes: (params?: { search?: string; tag?: string; forReview?: boolean; sort?: string }) => Promise<void>;
  loadStats: () => Promise<void>;
  createNote: (data: Record<string, unknown>) => Promise<LiteratureNote | null>;
  updateNote: (id: string, data: Record<string, unknown>) => Promise<boolean>;
  deleteNote: (id: string) => Promise<boolean>;
}

export const useLiteratureStore = create<LitStoreState>((set, get) => ({
  notes: [],
  total: 0,
  isLoading: false,
  stats: null,

  loadNotes: async (params) => {
    set({ isLoading: true });
    try {
      const sp = new URLSearchParams();
      if (params?.search) sp.set("search", params.search);
      if (params?.tag) sp.set("tag", params.tag);
      if (params?.forReview !== undefined) sp.set("for_review", params.forReview ? "1" : "0");
      if (params?.sort) sp.set("sort", params.sort);
      sp.set("pageSize", "50");

      const res = await fetch(`/api/literature?${sp}`);
      if (res.ok) {
        const json = await res.json();
        set({ notes: json.data ?? [], total: json.total ?? 0 });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  loadStats: async () => {
    try {
      const res = await fetch("/api/literature/stats");
      if (res.ok) {
        const json = await res.json();
        set({ stats: json.data });
      }
    } catch { /* silent */ }
  },

  createNote: async (data) => {
    try {
      const res = await fetch("/api/literature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        get().loadNotes();
        get().loadStats();
        return json.data;
      }
    } catch { /* silent */ }
    return null;
  },

  updateNote: async (id, data) => {
    try {
      const res = await fetch(`/api/literature/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) { get().loadNotes(); get().loadStats(); return true; }
    } catch { /* silent */ }
    return false;
  },

  deleteNote: async (id) => {
    try {
      const res = await fetch(`/api/literature/${id}`, { method: "DELETE" });
      if (res.ok) { get().loadNotes(); get().loadStats(); return true; }
    } catch { /* silent */ }
    return false;
  },
}));
