/**
 * Firecrawl API client for link discovery and content extraction.
 * Requires FIRECRAWL_API_KEY env var (optional — gracefully degrades if absent).
 *
 * Firecrawl docs: https://docs.firecrawl.dev
 */

const FIRECRAWL_API = "https://api.firecrawl.dev/v1";

function getApiKey(): string | null {
  return process.env.FIRECRAWL_API_KEY ?? null;
}

export interface FirecrawlLink {
  url: string;
  title: string | null;
}

/**
 * Use Firecrawl's map endpoint to discover all links on a page.
 * Faster than regex href extraction — handles JS-rendered pages.
 *
 * @param listingUrl - The listing/index page URL
 * @param filterPattern - Optional regex pattern to filter discovered URLs
 * @returns Discovered links matching the pattern
 */
export async function discoverLinks(
  listingUrl: string,
  filterPattern?: RegExp,
): Promise<FirecrawlLink[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const res = await fetch(`${FIRECRAWL_API}/map`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: listingUrl,
        params: {
          includeSubdomains: false,
        },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return [];

    const json = await res.json() as Record<string, unknown>;
    const links = json.links as Array<{ url: string; title?: string }> | undefined;
    if (!links) return [];

    return links
      .filter((l) => {
        if (!l.url?.startsWith("http")) return false;
        if (filterPattern && !filterPattern.test(l.url)) return false;
        return true;
      })
      .map((l) => ({ url: l.url, title: l.title ?? null }));
  } catch {
    return [];
  }
}

/**
 * Use Firecrawl's scrape endpoint to extract clean content from a URL.
 * Returns markdown content + metadata.
 */
export async function scrapeUrl(url: string): Promise<{
  markdown: string | null;
  title: string | null;
  author: string | null;
  publishDate: string | null;
} | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(`${FIRECRAWL_API}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        params: {
          onlyMainContent: true,
          formats: ["markdown"],
        },
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) return null;

    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Record<string, unknown> | undefined;
    if (!data?.markdown) return null;

    const metadata = data.metadata as Record<string, unknown> | undefined;

    return {
      markdown: data.markdown as string,
      title: (metadata?.title as string) ?? null,
      author: (metadata?.author as string) ?? null,
      publishDate: (metadata?.publishedTime as string) ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Check if Firecrawl is configured (API key present).
 */
export function isFirecrawlAvailable(): boolean {
  return !!getApiKey();
}
