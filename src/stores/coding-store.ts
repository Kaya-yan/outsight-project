import { create } from "zustand";
import type { Article, Annotation, CodingNode, CodingFramework } from "@/types/database";

interface CodingStoreState {
  // Article being coded
  article: Article | null;
  annotations: Annotation[];
  frameworks: CodingFramework[];
  nodes: CodingNode[];
  selectedNode: CodingNode | null;
  selectedText: string;

  isLoading: boolean;
  isSubmitting: boolean;

  setArticle: (article: Article | null) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  setFrameworks: (frameworks: CodingFramework[]) => void;
  setNodes: (nodes: CodingNode[]) => void;
  setSelectedNode: (node: CodingNode | null) => void;
  setSelectedText: (text: string) => void;
  setLoading: (loading: boolean) => void;
  setSubmitting: (submitting: boolean) => void;

  loadArticle: (id: string) => Promise<void>;
  loadFrameworks: () => Promise<void>;
  loadAnnotations: (articleId: string) => Promise<void>;
  loadFrameworkNodes: (frameworkId: string) => Promise<void>;
  submitAnnotation: (data: {
    node_id: string;
    quote_text?: string;
    confidence: number;
    note?: string;
  }) => Promise<boolean>;
  deleteAnnotation: (id: string) => Promise<void>;
}

export const useCodingStore = create<CodingStoreState>((set, get) => ({
  article: null,
  annotations: [],
  frameworks: [],
  nodes: [],
  selectedNode: null,
  selectedText: "",
  isLoading: true,
  isSubmitting: false,

  setArticle: (article) => set({ article }),
  setAnnotations: (annotations) => set({ annotations }),
  setFrameworks: (frameworks) => set({ frameworks }),
  setNodes: (nodes) => set({ nodes }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setSelectedText: (text) => set({ selectedText: text }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSubmitting: (submitting) => set({ isSubmitting: submitting }),

  loadArticle: async (id) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/articles/${id}`);
      if (res.ok) {
        const json = await res.json();
        set({ article: json.data });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  loadFrameworks: async () => {
    try {
      const res = await fetch("/api/frameworks");
      if (res.ok) {
        const json = await res.json();
        set({ frameworks: json.data ?? [] });
      }
    } catch {
      // Silent
    }
  },

  loadAnnotations: async (articleId) => {
    try {
      const res = await fetch(`/api/annotations?article_id=${articleId}`);
      if (res.ok) {
        const json = await res.json();
        set({ annotations: json.data ?? [] });
      }
    } catch {
      // Silent
    }
  },

  loadFrameworkNodes: async (frameworkId) => {
    try {
      const res = await fetch(`/api/frameworks/${frameworkId}`);
      if (res.ok) {
        const json = await res.json();
        set({ nodes: json.data.nodes ?? [] });
      }
    } catch {
      // Silent
    }
  },

  submitAnnotation: async (data) => {
    const { article } = get();
    if (!article) return false;

    set({ isSubmitting: true });
    try {
      const res = await fetch("/api/annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: article.id,
          node_id: data.node_id,
          quote_text: data.quote_text,
          confidence: data.confidence,
          note: data.note,
        }),
      });
      if (res.ok) {
        await get().loadAnnotations(article.id);
        await get().loadArticle(article.id);
        return true;
      }
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteAnnotation: async (id) => {
    await fetch(`/api/annotations/${id}`, { method: "DELETE" });
    const { article } = get();
    if (article) {
      await get().loadAnnotations(article.id);
      await get().loadArticle(article.id);
    }
  },
}));
