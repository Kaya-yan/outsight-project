import { create } from "zustand";
import type { DualCodingRound, Annotation, Article } from "@/types/database";
import type { AgreementResult } from "@/lib/stats/agreement";

interface DualCodingStoreState {
  rounds: DualCodingRound[];
  selectedRound: DualCodingRound | null;
  article: Article | null;
  annotationsA: Annotation[];
  annotationsB: Annotation[];
  agreement: AgreementResult | null;
  isLoading: boolean;

  loadRounds: (status?: string) => Promise<void>;
  loadRoundDetail: (id: string) => Promise<void>;
  calculateAgreement: (id: string) => Promise<AgreementResult | null>;
  arbitrate: (id: string, resolvedAnnotationIds: string[], note: string) => Promise<boolean>;
}

export const useDualCodingStore = create<DualCodingStoreState>((set, get) => ({
  rounds: [],
  selectedRound: null,
  article: null,
  annotationsA: [],
  annotationsB: [],
  agreement: null,
  isLoading: false,

  loadRounds: async (status) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const res = await fetch(`/api/dual-coding?${params}`);
      if (res.ok) {
        const json = await res.json();
        set({ rounds: json.data ?? [] });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  loadRoundDetail: async (id) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/dual-coding/${id}`);
      if (res.ok) {
        const json = await res.json();
        set({
          selectedRound: json.data.round,
          annotationsA: json.data.coderA ?? [],
          annotationsB: json.data.coderB ?? [],
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  calculateAgreement: async (id) => {
    try {
      const res = await fetch(`/api/dual-coding/${id}/calculate`, { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        set({ agreement: json.result });
        await get().loadRoundDetail(id);
        return json.result;
      }
    } catch {
      // Silent
    }
    return null;
  },

  arbitrate: async (id, resolvedAnnotationIds, note) => {
    try {
      const res = await fetch(`/api/dual-coding/${id}/arbitrate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolvedAnnotationIds, note }),
      });
      if (res.ok) {
        await get().loadRoundDetail(id);
        return true;
      }
    } catch {
      // Silent
    }
    return false;
  },
}));
