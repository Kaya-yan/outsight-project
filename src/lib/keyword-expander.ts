/**
 * Unified Multi-Tier Keyword Expansion System
 *
 * Three tiers of keywords for academic news discourse research,
 * designed to maximize historical article discovery across search engines,
 * GDELT, NewsAPI, and RSS sources.
 *
 * Tier 1 (Core): High-precision discourse keywords — run against all media.
 * Tier 2 (Policy): Topic-specific policy area keywords.
 * Tier 3 (Issues): Broader issue/event keywords for max recall.
 */

export const KEYWORD_TIERS = {
  tier1_core: [
    "Chinese modernization",
    "China modernization drive",
    "Chinese path to modernization",
    "Xi Jinping modernization",
    "China development model",
    "Chinese governance model",
  ],
  tier2_policy: [
    '"common prosperity" China',
    '"high-quality development" China',
    '"whole-process people\'s democracy" China',
    '"ecological civilization" China',
    '"new development philosophy" China',
    '"Belt and Road Initiative" China',
    '"global governance" China',
    '"soft power" China',
    '"national security" China',
    '"technology innovation" China',
  ],
  tier3_issues: [
    'China "poverty alleviation"',
    'China "green development"',
    'China "digital economy"',
    'China "supply chain"',
    'China "technology independence"',
    'China "self-reliance"',
    'China "dual circulation"',
    'China "new quality productive forces"',
    'China "people-centered development"',
    'China "community with shared future"',
  ],
} as const;

export type KeywordTier = keyof typeof KEYWORD_TIERS;

/** Map media outlet code to domain for site: searches */
export const MEDIA_SEARCH_DOMAINS: Record<string, string> = {
  NYT: "nytimes.com",
  WP: "washingtonpost.com",
  WSJ: "wsj.com",
  Guardian: "theguardian.com",
  Economist: "economist.com",
  BBC: "bbc.com",
};

export interface SearchQuery {
  /** The search engine query string */
  query: string;
  /** The domain to restrict to via site: operator */
  site: string;
  /** Which keyword tier this belongs to */
  tier: KeywordTier;
  /** The original keyword template */
  keyword: string;
  /** The media outlet code */
  media: string;
}

/**
 * Expand keywords and media into search queries.
 *
 * Each combination = one search query. For example:
 *   tier1_core × 6 media = 36 queries
 *   tier1_core + tier2_policy × 6 media = 96 queries
 *   all three tiers × 6 media = 156 queries
 */
export function expandSearchQueries(
  tiers: KeywordTier[],
  media: string[],
): SearchQuery[] {
  const queries: SearchQuery[] = [];

  for (const tier of tiers) {
    const keywords = KEYWORD_TIERS[tier] as readonly string[];
    for (const kw of keywords) {
      for (const m of media) {
        const domain = MEDIA_SEARCH_DOMAINS[m];
        if (!domain) continue; // skip unknown media
        queries.push({
          query: kw,
          site: domain,
          tier,
          keyword: kw,
          media: m,
        });
      }
    }
  }

  return queries;
}

/**
 * Get total keyword count across selected tiers (for logging / estimation).
 */
export function getKeywordCount(tiers: KeywordTier[]): number {
  return tiers.reduce((sum, t) => sum + (KEYWORD_TIERS[t] as readonly string[]).length, 0);
}
