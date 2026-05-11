import { create } from "zustand";
import type { DashboardStats } from "@/lib/data-access/dashboard";

interface DashboardStoreState {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardStoreState>((set) => ({
  stats: null,
  isLoading: false,
  error: null,

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/dashboard/stats");
      const json = await res.json();
      if (res.ok) {
        set({ stats: json.data });
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
