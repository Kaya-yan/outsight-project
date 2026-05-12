import type { Client } from "./data-access/base";
import { normalizeUrl, hashUrl } from "./dedup";
import { isWithinResearchPeriod } from "./time-filter";

export interface GuardResult {
  passed: boolean;
  reason?: "out_of_period" | "duplicate_url" | "hash_error";
  detail?: string;
  urlHash?: string;
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
    publish_date?: string | null;
    url: string;
  },
): Promise<GuardResult> {
  // Step 1: Time filter
  const periodCheck = isWithinResearchPeriod(article.publish_date);
  if (!periodCheck.valid) {
    console.log(`[InsertGuard] SKIPPED (time): ${article.url.slice(0, 100)} — ${periodCheck.reason}`);
    return { passed: false, reason: "out_of_period", detail: periodCheck.reason };
  }
  if (periodCheck.reason) {
    console.log(`[InsertGuard] WARNING: ${article.url.slice(0, 100)} — ${periodCheck.reason}`);
  }

  // Step 2: URL hash + dedup check
  const normalized = normalizeUrl(article.url);
  let urlHash: string;
  try {
    urlHash = hashUrl(normalized);
  } catch (err) {
    console.error(`[InsertGuard] hashUrl failed for: ${article.url}`, err);
    return { passed: false, reason: "hash_error" };
  }

  const { data } = await client
    .from("articles")
    .select("id")
    .eq("url_hash", urlHash)
    .limit(1);

  if (data && data.length > 0) {
    console.log(`[InsertGuard] SKIPPED (duplicate): ${article.url.slice(0, 100)}`);
    return { passed: false, reason: "duplicate_url" };
  }

  return { passed: true, urlHash };
}
