export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          email: string;
          avatar_url: string | null;
          role: "admin" | "lead_researcher" | "researcher" | "coder" | "viewer";
          institution: string | null;
          is_active: boolean;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          email: string;
          avatar_url?: string | null;
          role?: "admin" | "lead_researcher" | "researcher" | "coder" | "viewer";
          institution?: string | null;
          is_active?: boolean;
          metadata?: Record<string, unknown>;
        };
        Update: {
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: "admin" | "lead_researcher" | "researcher" | "coder" | "viewer";
          institution?: string | null;
          is_active?: boolean;
          metadata?: Record<string, unknown>;
        };
      };
      coding_frameworks: {
        Row: {
          id: string;
          name: string;
          name_zh: string | null;
          description: string | null;
          version: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_zh?: string | null;
          description?: string | null;
          version?: number;
          is_active?: boolean;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          name_zh?: string | null;
          description?: string | null;
          version?: number;
          is_active?: boolean;
        };
      };
      coding_nodes: {
        Row: {
          id: string;
          framework_id: string;
          parent_id: string | null;
          code: string;
          label: string;
          label_zh: string | null;
          description: string | null;
          level: number;
          lft: number | null;
          rgt: number | null;
          color: string;
          is_active: boolean;
          sort_order: number;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          framework_id: string;
          parent_id?: string | null;
          code: string;
          label: string;
          label_zh?: string | null;
          description?: string | null;
          level?: number;
          lft?: number | null;
          rgt?: number | null;
          color?: string;
          is_active?: boolean;
          sort_order?: number;
          metadata?: Record<string, unknown>;
        };
        Update: {
          parent_id?: string | null;
          code?: string;
          label?: string;
          label_zh?: string | null;
          description?: string | null;
          level?: number;
          lft?: number | null;
          rgt?: number | null;
          color?: string;
          is_active?: boolean;
          sort_order?: number;
          metadata?: Record<string, unknown>;
        };
      };
      articles: {
        Row: {
          id: string;
          title: string;
          title_zh: string | null;
          url: string;
          source: string;
          media: string;
          source_type: "mainstream_media" | "social_media" | "academic_journal" | "government" | "other";
          publish_date: string | null;
          period: string | null;
          language: "en" | "zh" | "bilingual";
          author: string | null;
          abstract: string | null;
          full_text: string | null;
          full_text_status: "missing" | "partial" | "complete" | "manual_uploaded";
          url_hash: string | null;
          content: string | null;
          word_count: number | null;
          keywords: string[];
          keyword_combo: string[];
          region: string | null;
          status: string;
          metadata: Record<string, unknown>;
          is_archived: boolean;
          archived_at: string | null;
          collection_batch_id: string | null;
          ai_summary: string | null;
          ai_sentiment: string | null;
          ai_confidence: number | null;
          ai_framework_hint: string | null;
          ai_evidence_quotes: string[];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          title_zh?: string | null;
          url: string;
          source?: string;
          media?: string;
          source_type?: "mainstream_media" | "social_media" | "academic_journal" | "government" | "other";
          publish_date?: string | null;
          period?: string | null;
          language?: "en" | "zh" | "bilingual";
          author?: string | null;
          abstract?: string | null;
          full_text?: string | null;
          full_text_status?: "missing" | "partial" | "complete" | "manual_uploaded";
          url_hash?: string | null;
          content?: string | null;
          word_count?: number | null;
          keywords?: string[];
          keyword_combo?: string[];
          region?: string | null;
          status?: string;
          metadata?: Record<string, unknown>;
          collection_batch_id?: string | null;
          ai_summary?: string | null;
          ai_sentiment?: string | null;
          ai_confidence?: number | null;
          ai_framework_hint?: string | null;
          ai_evidence_quotes?: string[];
          created_by?: string | null;
        };
        Update: {
          title?: string;
          title_zh?: string | null;
          url?: string;
          source?: string;
          media?: string;
          source_type?: "mainstream_media" | "social_media" | "academic_journal" | "government" | "other";
          publish_date?: string | null;
          period?: string | null;
          language?: "en" | "zh" | "bilingual";
          author?: string | null;
          abstract?: string | null;
          full_text?: string | null;
          full_text_status?: "missing" | "partial" | "complete" | "manual_uploaded";
          url_hash?: string | null;
          content?: string | null;
          word_count?: number | null;
          keywords?: string[];
          keyword_combo?: string[];
          region?: string | null;
          status?: string;
          metadata?: Record<string, unknown>;
          is_archived?: boolean;
          archived_at?: string | null;
          ai_summary?: string | null;
          ai_sentiment?: string | null;
          ai_confidence?: number | null;
          ai_framework_hint?: string | null;
          ai_evidence_quotes?: string[];
        };
      };
      annotations: {
        Row: {
          id: string;
          article_id: string;
          node_id: string;
          coder_id: string;
          quote_text: string | null;
          start_offset: number | null;
          end_offset: number | null;
          note: string | null;
          confidence: number | null;
          is_resolved: boolean;
          resolved_by: string | null;
          resolved_at: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          node_id: string;
          coder_id: string;
          quote_text?: string | null;
          start_offset?: number | null;
          end_offset?: number | null;
          note?: string | null;
          confidence?: number | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          node_id?: string;
          quote_text?: string | null;
          start_offset?: number | null;
          end_offset?: number | null;
          note?: string | null;
          confidence?: number | null;
          is_resolved?: boolean;
          resolved_by?: string | null;
          resolved_at?: string | null;
          metadata?: Record<string, unknown>;
        };
      };
      assignments: {
        Row: {
          id: string;
          article_id: string;
          assignee_id: string;
          assigned_by: string;
          status: "assigned" | "in_progress" | "completed" | "reviewed" | "disputed";
          priority: number;
          due_date: string | null;
          completed_at: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          assignee_id: string;
          assigned_by: string;
          status?: "assigned" | "in_progress" | "completed" | "reviewed" | "disputed";
          priority?: number;
          due_date?: string | null;
          note?: string | null;
        };
        Update: {
          status?: "assigned" | "in_progress" | "completed" | "reviewed" | "disputed";
          priority?: number;
          due_date?: string | null;
          completed_at?: string | null;
          note?: string | null;
        };
      };
      collection_logs: {
        Row: {
          id: string;
          batch_id: string;
          source: string;
          query_params: Record<string, unknown>;
          articles_fetched: number;
          articles_new: number;
          status: "running" | "completed" | "failed" | "partial";
          error_message: string | null;
          started_at: string;
          completed_at: string | null;
          triggered_by: string | null;
        };
        Insert: {
          id?: string;
          batch_id: string;
          source: string;
          query_params?: Record<string, unknown>;
          articles_fetched?: number;
          articles_new?: number;
          status?: "running" | "completed" | "failed" | "partial";
          error_message?: string | null;
          triggered_by?: string | null;
        };
        Update: {
          articles_fetched?: number;
          articles_new?: number;
          status?: "running" | "completed" | "failed" | "partial";
          error_message?: string | null;
          completed_at?: string | null;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Record<string, unknown>;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Record<string, unknown>;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: Record<string, unknown>;
      };
      ai_queue: {
        Row: {
          id: string;
          job_type: "summarize" | "classify" | "sentiment" | "extract_entities" | "suggest_codes" | "translate" | "qa";
          status: "pending" | "processing" | "completed" | "failed" | "cancelled";
          priority: number;
          payload: Record<string, unknown>;
          result: Record<string, unknown> | null;
          model: string;
          tokens_used: number | null;
          error_message: string | null;
          retry_count: number;
          max_retries: number;
          created_by: string | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          job_type: "summarize" | "classify" | "sentiment" | "extract_entities" | "suggest_codes" | "translate" | "qa";
          status?: "pending" | "processing" | "completed" | "failed" | "cancelled";
          priority?: number;
          payload?: Record<string, unknown>;
          model?: string;
          max_retries?: number;
          created_by?: string | null;
        };
        Update: {
          status?: "pending" | "processing" | "completed" | "failed" | "cancelled";
          result?: Record<string, unknown> | null;
          tokens_used?: number | null;
          error_message?: string | null;
          retry_count?: number;
          started_at?: string | null;
          completed_at?: string | null;
        };
      };
      ai_prompts: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          job_type: string;
          system_prompt: string;
          user_prompt_template: string;
          variables: unknown[];
          model: string;
          temperature: number;
          max_tokens: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          job_type: string;
          system_prompt: string;
          user_prompt_template: string;
          variables?: unknown[];
          model?: string;
          temperature?: number;
          max_tokens?: number;
          is_active?: boolean;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          system_prompt?: string;
          user_prompt_template?: string;
          variables?: unknown[];
          model?: string;
          temperature?: number;
          max_tokens?: number;
          is_active?: boolean;
        };
      };
      crawl_jobs: {
        Row: {
          id: string;
          status: "pending" | "running" | "partial_complete" | "completed" | "failed" | "timeout";
          progress: number;
          total_fetched: number;
          total_new: number;
          batch_index: number;
          batch_total: number;
          error_message: string | null;
          query_params: Record<string, unknown>;
          created_at: string;
          finished_at: string | null;
          triggered_by: string | null;
        };
        Insert: {
          id?: string;
          status?: "pending" | "running" | "partial_complete" | "completed" | "failed" | "timeout";
          progress?: number;
          total_fetched?: number;
          total_new?: number;
          batch_index?: number;
          batch_total?: number;
          error_message?: string | null;
          query_params?: Record<string, unknown>;
          triggered_by?: string | null;
        };
        Update: {
          status?: "pending" | "running" | "partial_complete" | "completed" | "failed" | "timeout";
          progress?: number;
          total_fetched?: number;
          total_new?: number;
          batch_index?: number;
          batch_total?: number;
          error_message?: string | null;
          finished_at?: string | null;
        };
      };
      dual_coding_rounds: {
        Row: {
          id: string;
          article_id: string;
          coder_a_id: string;
          coder_b_id: string;
          status: "in_progress" | "both_done" | "disputed" | "arbitrated";
          agreement_rate: number | null;
          kappa: number | null;
          arbiter_id: string | null;
          arbiter_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          coder_a_id: string;
          coder_b_id: string;
          status?: "in_progress" | "both_done" | "disputed" | "arbitrated";
          agreement_rate?: number | null;
          kappa?: number | null;
          arbiter_id?: string | null;
          arbiter_note?: string | null;
        };
        Update: {
          status?: "in_progress" | "both_done" | "disputed" | "arbitrated";
          agreement_rate?: number | null;
          kappa?: number | null;
          arbiter_id?: string | null;
          arbiter_note?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      archive_old_articles: {
        Args: { cutoff: string };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
  };
}

export type Tables = Database["public"]["Tables"];
export type Profile = Tables["profiles"]["Row"];
export type CodingFramework = Tables["coding_frameworks"]["Row"];
export type CodingNode = Tables["coding_nodes"]["Row"];
export type Article = Tables["articles"]["Row"];
export type Annotation = Tables["annotations"]["Row"];
export type Assignment = Tables["assignments"]["Row"];
export type CollectionLog = Tables["collection_logs"]["Row"];
export type ActivityLog = Tables["activity_logs"]["Row"];
export type AiJob = Tables["ai_queue"]["Row"];
export type AiPrompt = Tables["ai_prompts"]["Row"];
export type DualCodingRound = Tables["dual_coding_rounds"]["Row"];
export type CrawlJob = Tables["crawl_jobs"]["Row"];

export type FullTextStatus = "missing" | "partial" | "complete" | "manual_uploaded";

export type DualCodingRoundStatus =
  | "in_progress"
  | "both_done"
  | "disputed"
  | "arbitrated";

export type ArticleStatus =
  | "待发现"
  | "已入库"
  | "已下载全文"
  | "已清洗"
  | "已预读"
  | "待编码"
  | "编码完成"
  | "已封存";

export const ARTICLE_STATUS_TRANSITIONS: Record<ArticleStatus, ArticleStatus[]> = {
  "待发现": ["已入库"],
  "已入库": ["已下载全文", "已封存"],
  "已下载全文": ["已清洗", "已封存"],
  "已清洗": ["已预读", "待编码", "已封存"],
  "已预读": ["待编码", "已封存"],
  "待编码": ["编码完成", "已封存"],
  "编码完成": ["已封存"],
  "已封存": [],
};
