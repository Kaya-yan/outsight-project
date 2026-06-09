// ============================================================
// GDELT Extended Keyword Query System
// ============================================================
// Three-dimensional combinatorial keywords for covering
// Chinese modernization discourse across subject × theme × action.
//
// Dimensions:
//   Subject — the entity or perspective being discussed
//   Theme   — the conceptual domain or policy area
//   Action  — the process or dynamic being examined
//
// Combinations are curated into two priority tiers:
//   Tier 1: High-signal combos, run against all outlets × all periods
//   Tier 2: Broadening combos, run only for weak outlets on recent periods

export interface KeywordCombo {
  /** The query string sent to GDELT */
  query: string;
  /** Human-readable label for display / tracking */
  label: string;
  /** Priority: 1 = primary, 2 = broadening */
  tier: 1 | 2;
}

// Dimension pools (for reference; actual combos are hand-curated below)
export const SUBJECTS = [
  "China",
  "Xi Jinping",
  "Chinese",
  "Beijing",
  "CCP",
] as const;

export const THEMES = [
  "modernization",
  "development",
  "economic growth",
  "foreign policy",
  "Belt and Road",
  "common prosperity",
  "global governance",
  "soft power",
  "national security",
  "technology innovation",
] as const;

export const ACTIONS = [
  "strategy",
  "influence",
  "competition",
  "cooperation",
  "leadership",
] as const;

// Curated keyword combinations — 10 Tier 1 + 20 Tier 2 = 30 total
export const KEYWORD_COMBOS: KeywordCombo[] = [
  // === Tier 1: Core high-signal combinations (10) ===
  { query: '"Xi Jinping" AND modernization',                        label: "Xi Jinping: modernization",                        tier: 1 },
  { query: '"China" AND modernization',                             label: "China: modernization",                            tier: 1 },
  { query: '"China" AND development',                               label: "China: development",                              tier: 1 },
  { query: '"China" AND "foreign policy"',                          label: "China: foreign policy",                           tier: 1 },
  { query: '"China" AND "Belt and Road"',                           label: "China: Belt and Road",                            tier: 1 },
  { query: '"China" AND "common prosperity"',                       label: "China: common prosperity",                        tier: 1 },
  { query: '"China" AND "global governance"',                       label: "China: global governance",                        tier: 1 },
  { query: '"China" AND "soft power"',                              label: "China: soft power",                               tier: 1 },
  { query: '"China" AND "national security"',                       label: "China: national security",                        tier: 1 },
  { query: '"China" AND "technology innovation"',                   label: "China: technology innovation",                    tier: 1 },

  // === Tier 2: Broadening / exploratory combinations (20) ===
  // Original Tier 2
  { query: '"Xi Jinping" AND development',                          label: "Xi Jinping: development",                         tier: 2 },
  { query: '"Xi Jinping" AND "Belt and Road"',                      label: "Xi Jinping: Belt and Road",                       tier: 2 },
  { query: '"Xi Jinping" AND "foreign policy"',                     label: "Xi Jinping: foreign policy",                      tier: 2 },
  { query: '"CCP" AND modernization',                               label: "CCP: modernization",                              tier: 2 },
  { query: '"China" strategy influence',                            label: "China: strategy + influence",                     tier: 2 },
  { query: '"China" competition',                                   label: "China: competition",                              tier: 2 },
  { query: '"China" cooperation',                                   label: "China: cooperation",                              tier: 2 },
  { query: '"Chinese" economic growth',                             label: "Chinese: economic growth",                        tier: 2 },
  { query: '"Beijing" modernization',                               label: "Beijing: modernization",                          tier: 2 },
  { query: '"Chinese" discourse',                                   label: "Chinese: discourse",                              tier: 2 },

  // Economy & Trade
  { query: '"China" AND economy',                                   label: "China: economy",                                  tier: 2 },
  { query: '"China" AND trade',                                     label: "China: trade",                                    tier: 2 },
  { query: '"China" AND tariff',                                    label: "China: tariff",                                   tier: 2 },
  { query: '"China" AND "supply chain"',                            label: "China: supply chain",                             tier: 2 },
  { query: '"China" AND "economic reform"',                         label: "China: economic reform",                          tier: 2 },

  // US-China Relations
  { query: '"US-China" OR "Sino-American"',                         label: "US-China / Sino-American",                        tier: 2 },
  { query: '"China" AND "United States" AND relations',             label: "China-US relations",                              tier: 2 },

  // Technology & Competition
  { query: '"China" AND technology AND competition',                label: "China: tech competition",                         tier: 2 },
  { query: '"China" AND AI OR artificial intelligence',             label: "China: AI / artificial intelligence",             tier: 2 },

  // Global South & Climate
  { query: '"China" AND "global south"',                            label: "China: global south",                             tier: 2 },
];

/** Get combos by tier */
export function getCombosByTier(tier: 1 | 2): KeywordCombo[] {
  return KEYWORD_COMBOS.filter((c) => c.tier === tier);
}

export const TIER_1_COMBOS = getCombosByTier(1);
export const TIER_2_COMBOS = getCombosByTier(2);
