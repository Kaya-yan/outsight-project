/**
 * Paywall detection — dual-condition approach:
 * word_count < 800 AND paywall keywords present → paywalled
 * word_count < 800 but no keywords → partial (short article, not paywalled)
 */

const PAYWALL_KEYWORDS = [
  // English
  "subscribe",
  "subscription",
  "sign in",
  "log in",
  "login required",
  "members only",
  "premium content",
  "this article is for subscribers",
  "continue reading",
  "read more",
  "unlock this article",
  "create an account",
  "register to read",
  "become a member",
  "start your free trial",
  "digital access",
  "already a subscriber",
  "subscriber exclusive",
  "for subscribers",
  "paywall",
  "metered",
  "reached your limit",
  "free articles remaining",
  "article limit",
  // Chinese
  "订阅",
  "登录后查看",
  "会员专享",
  "付费阅读",
  "开通会员",
  "免费试读",
];

const PAYWALL_PATTERNS = PAYWALL_KEYWORDS.map(
  (kw) => new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
);

export interface PaywallDetectionResult {
  isPaywalled: boolean;
  isShort: boolean;
  matchedKeywords: string[];
}

export function detectPaywall(fullText: string | null, wordCount: number | null): PaywallDetectionResult {
  if (!fullText) {
    return { isPaywalled: false, isShort: false, matchedKeywords: [] };
  }

  const isShort = (wordCount ?? 0) < 800;
  if (!isShort) {
    return { isPaywalled: false, isShort: false, matchedKeywords: [] };
  }

  const matchedKeywords: string[] = [];
  for (let i = 0; i < PAYWALL_PATTERNS.length; i++) {
    if (PAYWALL_PATTERNS[i].test(fullText)) {
      matchedKeywords.push(PAYWALL_KEYWORDS[i]);
    }
  }

  return {
    isPaywalled: matchedKeywords.length > 0,
    isShort: true,
    matchedKeywords,
  };
}
