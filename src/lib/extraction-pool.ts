import { extractContent, type ExtractionResult } from "./content-extractor";

/**
 * Run content extraction against a list of URLs with concurrency limiting.
 * Returns a Map of URL → ExtractionResult.
 */
export async function extractWithConcurrency(
  urls: string[],
  concurrency = 5,
  onProgress?: (url: string, result: ExtractionResult) => void,
): Promise<Map<string, ExtractionResult>> {
  const results = new Map<string, ExtractionResult>();
  if (urls.length === 0) return results;

  const queue = [...urls];

  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift()!;
      const result = await extractContent(url);
      results.set(url, result);
      onProgress?.(url, result);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, () => worker());
  await Promise.allSettled(workers);

  return results;
}

/**
 * Count extraction success / failure from a result map.
 */
export function summarizeExtraction(results: Map<string, ExtractionResult>): {
  attempted: number;
  succeeded: number;
  failed: number;
} {
  let succeeded = 0;
  let failed = 0;
  for (const r of results.values()) {
    if (r.fullText && r.fullText.length >= 50) {
      succeeded++;
    } else {
      failed++;
    }
  }
  return { attempted: results.size, succeeded, failed };
}
