import { create } from "zustand";
import type { CodingTask } from "@/types/database";

interface TaskListFilters {
  my?: boolean;
  status?: string;
  taskType?: string;
}

interface TaskStoreState {
  tasks: CodingTask[];
  selectedTask: CodingTask | null;
  isLoading: boolean;

  setFilters: (filters: TaskListFilters) => void;
  loadTasks: (filters?: TaskListFilters) => Promise<void>;
  loadTaskDetail: (id: string) => Promise<void>;
  createTask: (input: {
    article_id: string;
    task_type: "solo" | "dual";
    coder_a_id: string;
    coder_b_id?: string;
    framework_id?: string;
    reviewer_id?: string;
    priority?: number;
    due_date?: string;
    notes?: string;
  }) => Promise<CodingTask | null>;
  submitTask: (id: string) => Promise<CodingTask | null>;
  reviewTask: (id: string, note: string) => Promise<boolean>;
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [],
  selectedTask: null,
  isLoading: false,

  setFilters: () => {
    // Stored for re-fetch; actual fetching is done via loadTasks
  },

  loadTasks: async (filters) => {
    set({ isLoading: true });
    try {
      const params = new URLSearchParams();
      if (filters?.my) params.set("my", "1");
      if (filters?.status) params.set("status", filters.status);
      if (filters?.taskType) params.set("task_type", filters.taskType);
      params.set("pageSize", "50");

      const res = await fetch(`/api/tasks?${params}`);
      if (res.ok) {
        const json = await res.json();
        set({ tasks: json.data ?? [] });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  loadTaskDetail: async (id) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/tasks/${id}`);
      if (res.ok) {
        const json = await res.json();
        set({ selectedTask: json.data.task });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  createTask: async (input) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (res.ok) {
        await get().loadTasks({ my: true });
        return json.data;
      }
      // Propagate server error
      throw new Error(json.error ?? "创建失败");
    } catch (err) {
      throw err;
    }
  },

  submitTask: async (id) => {
    try {
      const res = await fetch(`/api/tasks/${id}/submit`, { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        await get().loadTasks({ my: true });
        return json.task;
      }
    } catch {
      // Silent
    }
    return null;
  },

  reviewTask: async (id, note) => {
    try {
      const res = await fetch(`/api/tasks/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (res.ok) {
        await get().loadTasks();
        return true;
      }
    } catch {
      // Silent
    }
    return false;
  },
}));
