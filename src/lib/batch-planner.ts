/**
 * Batch Plan Generator
 *
 * Splits the full crawl workflow into Vercel-safe batches (each ≤ 8 seconds).
 * Returns a BatchPlan array stored in crawl_jobs.query_params for execution
 * by the frontend-driven /api/crawl/execute-batch endpoint.
 */

import { TIER_1_COMBOS } from "./gdelt-keywords";
import { expandSearchQueries, type KeywordTier } from "./keyword-expander";

// ============================================================
// Batch types
// ============================================================

export type BatchType = "rss_newsapi" | "gdelt" | "search" | "flush";

export interface GDELTBatchParams {
  periodValue: string;
  periodTimespan: string;
  comboIndices: number[]; // indices into TIER_1_COMBOS
}

export interface SearchBatchParams {
  queryIndices: number[]; // indices into the expanded search queries array
}

export interface Batch {
  type: BatchType;
  label: string;
  status: "pending" | "running" | "done" | "failed";
  params?: GDELTBatchParams | SearchBatchParams;
}

// ============================================================
// Media outlets and periods (matching crawl scope)
// ============================================================

const ALL_PERIODS = [
  { value: "2022.10-2023.03", timespan: "20221001000000-20230331235959" },
  { value: "2023.04-2023.09", timespan: "20230401000000-20230930235959" },
  { value: "2023.10-2024.03", timespan: "20231001000000-20240331235959" },
  { value: "2024.04-2024.09", timespan: "20240401000000-20240930235959" },
  { value: "2024.10-2024.12", timespan: "20241001000000-20241231235959" },
  { value: "2025.01-2025.06", timespan: "20250101000000-20250630235959" },
  { value: "2025.07-2025.12", timespan: "20250701000000-20251231235959" },
];

const ALL_MEDIA_NAMES = ["NYT", "WP", "WSJ", "Guardian", "Economist", "BBC"];

// ============================================================
// Batch size tuning (safe for Vercel ~8s budget)
// ============================================================

const GDELT_COMBOS_PER_BATCH = 3; // ~6s per batch (3 queries × 1.5s delay + 0.5s fetch)
const SEARCH_QUERIES_PER_BATCH = 6; // ~7s per batch (6 queries × 1s delay + 0.5s fetch)

// ============================================================
// Plan generator
// ============================================================

export function generateBatchPlan(): Batch[] {
  const batches: Batch[] = [];

  // Batch 0: RSS + NewsAPI
  batches.push({
    type: "rss_newsapi",
    label: "RSS 订阅源 + NewsAPI",
    status: "pending",
  });

  // GDELT batches: each period split by combos
  for (const period of ALL_PERIODS) {
    const comboIndices = TIER_1_COMBOS.map((_, i) => i);
    // Split combo indices into chunks
    for (let i = 0; i < comboIndices.length; i += GDELT_COMBOS_PER_BATCH) {
      const chunk = comboIndices.slice(i, i + GDELT_COMBOS_PER_BATCH);
      const firstLabel = TIER_1_COMBOS[chunk[0]]?.label ?? "";
      const lastLabel = chunk.length > 1 ? TIER_1_COMBOS[chunk[chunk.length - 1]]?.label : "";
      batches.push({
        type: "gdelt",
        label: `GDELT [${period.value}] ${firstLabel}${lastLabel && lastLabel !== firstLabel ? ` … ${lastLabel}` : ""}`,
        status: "pending",
        params: {
          periodValue: period.value,
          periodTimespan: period.timespan,
          comboIndices: chunk,
        },
      });
    }
  }

  // Search Engine batches
  const searchTiers: KeywordTier[] = ["tier1_core", "tier2_policy"];
  const allSearchQueries = expandSearchQueries(searchTiers, ALL_MEDIA_NAMES);

  for (let i = 0; i < allSearchQueries.length; i += SEARCH_QUERIES_PER_BATCH) {
    const chunk = allSearchQueries.slice(i, i + SEARCH_QUERIES_PER_BATCH);
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    batches.push({
      type: "search",
      label: `搜索引擎 ${first.media}/${first.keyword} … ${last.media}/${last.keyword}`,
      status: "pending",
      params: {
        queryIndices: chunk.map((_, j) => i + j),
      },
    });
  }

  // Final flush batch
  batches.push({
    type: "flush",
    label: "最终入库去重",
    status: "pending",
  });

  return batches;
}

/** Get the total batch count without generating the full plan */
export function getTotalBatchCount(): number {
  const gdeltChunks = Math.ceil(TIER_1_COMBOS.length / GDELT_COMBOS_PER_BATCH);
  const searchTiers: KeywordTier[] = ["tier1_core", "tier2_policy"];
  const totalSearchQueries = expandSearchQueries(searchTiers, ALL_MEDIA_NAMES).length;
  const searchChunks = Math.ceil(totalSearchQueries / SEARCH_QUERIES_PER_BATCH);
  return 1 + ALL_PERIODS.length * gdeltChunks + searchChunks + 1;
}
