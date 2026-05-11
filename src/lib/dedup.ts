import type { Client } from "./data-access/base";

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Remove trailing slash
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    // Remove tracking params
    const skipParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "ref"];
    for (const p of skipParams) {
      u.searchParams.delete(p);
    }
    u.searchParams.sort();
    return u.toString();
  } catch {
    return url.trim().toLowerCase();
  }
}

export async function findExistingUrls(
  client: Client,
  urls: string[],
): Promise<Set<string>> {
  if (urls.length === 0) return new Set();

  const normalized = urls.map(normalizeUrl);
  const existing = new Set<string>();

  // Check in batches of 100 (Supabase in filter max)
  for (let i = 0; i < normalized.length; i += 100) {
    const batch = normalized.slice(i, i + 100);
    const { data } = await client
      .from("articles")
      .select("url")
      .in("url", batch);

    if (data) {
      for (const row of data) {
        existing.add(normalizeUrl(row.url));
      }
    }
  }

  return existing;
}
