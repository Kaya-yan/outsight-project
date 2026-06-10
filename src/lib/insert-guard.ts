import type { Client } from "./data-access/base";
import { normalizeUrl, hashUrl } from "./dedup";
import { isWithinResearchPeriod } from "./time-filter";

export type FilterReason =
  | "passed"
  | "duplicate_url"
  | "out_of_date_range_before"
  | "out_of_date_range_after"
  | "missing_publish_date"
  | "unparseable_date"
  | "hash_error";

export interface GuardResult {
  passed: boolean;
  reason: FilterReason;
  detail?: string;
  urlHash?: string;
}

export interface GuardStats {
  total: number;
  passed: number;
  filtered: Record<FilterReason, number>;
  /** Per-article filter details (for verbose logging) */
  details: Array<{ url: string; title?: string; reason: FilterReason; detail: string }>;
}

/**
 * Create an empty GuardStats object with all filter reasons initialized to 0.
 */
function emptyStats(): GuardStats {
  return {
    total: 0,
    passed: 0,
    filtered: {
      passed: 0,
      duplicate_url: 0,
      out_of_date_range_before: 0,
      out_of_date_range_after: 0,
      missing_publish_date: 0,
      unparseable_date: 0,
      hash_error: 0,
    },
    details: [],
  };
}

/**
 * Pre-insert check for every article entering the database:
 * 1. Verify publish_date within research period (2022-10-01 to 2024-12-31)
 * 2. Compute URL hash and check for duplicates in the database
 *
 * Returns a GuardResult. Caller MUST skip insertion when passed === false.
 */
export async function checkArticleBeforeInsert(
  client: Client,
  article: {
    title?: string;
    publish_date?: string | null;
    url: string;
  },
): Promise<GuardResult> {
  // Step 1: Time filter
  if (!article.publish_date) {
    console.log(`[Guard] MISSING_DATE: ${article.url.slice(0, 100)}`);
    return {
      passed: false,
      reason: "missing_publish_date",
      detail: "publish_date is null or undefined",
    };
  }

  const periodCheck = isWithinResearchPeriod(article.publish_date);

  if (periodCheck.reason === "null_date_allowed_with_warning") {
    console.log(`[Guard] MISSING_DATE: ${article.url.slice(0, 100)}`);
    return {
      passed: false,
      reason: "missing_publish_date",
      detail: "publish_date is null",
    };
  }

  if (periodCheck.reason === "unparseable_date_allowed_with_warning") {
    console.log(`[Guard] UNPARSEABLE_DATE: ${article.url.slice(0, 100)} — "${article.publish_date}"`);
    return {
      passed: false,
      reason: "unparseable_date",
      detail: `Cannot parse date: "${article.publish_date}"`,
    };
  }

  if (!periodCheck.valid) {
    const isAfter = periodCheck.reason?.includes("after_research_period");
    const reason: FilterReason = isAfter ? "out_of_date_range_after" : "out_of_date_range_before";
    console.log(`[Guard] ${reason.toUpperCase()}: ${article.url.slice(0, 100)} — ${periodCheck.reason}`);
    return { passed: false, reason, detail: periodCheck.reason ?? "out of research period" };
  }

  // Step 2: URL hash + dedup check
  const normalized = normalizeUrl(article.url);
  let urlHash: string;
  try {
    urlHash = hashUrl(normalized);
  } catch (err) {
    console.error(`[Guard] HASH_ERROR: hashUrl failed for ${article.url}`, err);
    return { passed: false, reason: "hash_error", detail: String(err) };
  }

  const { data } = await client
    .from("articles")
    .select("id")
    .eq("url_hash", urlHash)
    .limit(1);

  if (data && data.length > 0) {
    console.log(`[Guard] DUPLICATE_URL: ${article.url.slice(0, 100)}`);
    return { passed: false, reason: "duplicate_url", detail: "URL already exists in database" };
  }

  console.log(`[Guard] PASSED: ${article.url.slice(0, 100)}`);
  return { passed: true, reason: "passed", urlHash };
}

// ============================================================
// Batch guard with statistics (optimized — single DB query)
// ============================================================

export interface BatchGuardResult {
  passed: Array<{ article: { title?: string; publish_date?: string | null; url: string }; guard: GuardResult }>;
  stats: GuardStats;
}

/**
 * Run insert guard across a batch of articles, collecting detailed statistics.
 *
 * Optimization (supabase-database pattern): batch the dedup check into a single
 * `in` query instead of N individual queries. Local filters (time, hash) run first
 * to minimize the hash set sent to the DB.
 */
export async function batchGuardCheck(
  client: Client,
  articles: Array<{ title?: string; publish_date?: string | null; url: string }>,
): Promise<BatchGuardResult> {
  const stats = emptyStats();
  stats.total = articles.length;

  // Phase 1: Local pre-filtering (time check + hash computation)
  const candidates: Array<{
    article: { title?: string; publish_date?: string | null; url: string };
    urlHash: string;
  }> = [];

  for (const article of articles) {
    // Time filter
    if (!article.publish_date) {
      stats.filtered.missing_publish_date++;
      stats.details.push({ url: article.url, title: article.title, reason: "missing_publish_date", detail: "publish_date is null or undefined" });
      continue;
    }

    const periodCheck = isWithinResearchPeriod(article.publish_date);

    if (periodCheck.reason === "null_date_allowed_with_warning") {
      stats.filtered.missing_publish_date++;
      stats.details.push({ url: article.url, title: article.title, reason: "missing_publish_date", detail: "publish_date is null" });
      continue;
    }

    if (periodCheck.reason === "unparseable_date_allowed_with_warning") {
      stats.filtered.unparseable_date++;
      stats.details.push({ url: article.url, title: article.title, reason: "unparseable_date", detail: `Cannot parse date: "${article.publish_date}"` });
      continue;
    }

    if (!periodCheck.valid) {
      const isAfter = periodCheck.reason?.includes("after_research_period");
      const reason: FilterReason = isAfter ? "out_of_date_range_after" : "out_of_date_range_before";
      stats.filtered[reason]++;
      stats.details.push({ url: article.url, title: article.title, reason, detail: periodCheck.reason ?? "out of research period" });
      continue;
    }

    // Hash computation
    const normalized = normalizeUrl(article.url);
    let urlHash: string;
    try {
      urlHash = hashUrl(normalized);
    } catch (err) {
      stats.filtered.hash_error++;
      stats.details.push({ url: article.url, title: article.title, reason: "hash_error", detail: String(err) });
      continue;
    }

    candidates.push({ article, urlHash });
  }

  if (candidates.length === 0) {
    return { passed: [], stats };
  }

  // Phase 2: Single batch dedup query (supabase-database optimization)
  const hashes = candidates.map((c) => c.urlHash);
  const { data: existing } = await client
    .from("articles")
    .select("url_hash")
    .in("url_hash", hashes)
    .limit(hashes.length);

  const existingHashes = new Set(
    ((existing ?? []) as Array<{ url_hash: string }>).map((r) => r.url_hash),
  );

  // Phase 3: Filter out duplicates
  const passed: BatchGuardResult["passed"] = [];

  for (const { article, urlHash } of candidates) {
    if (existingHashes.has(urlHash)) {
      stats.filtered.duplicate_url++;
      stats.details.push({ url: article.url, title: article.title, reason: "duplicate_url", detail: "URL already exists in database" });
    } else {
      stats.passed++;
      passed.push({ article, guard: { passed: true, reason: "passed", urlHash } });
    }
  }

  return { passed, stats };
}
