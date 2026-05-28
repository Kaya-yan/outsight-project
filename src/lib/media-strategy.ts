/**
 * Media paywall strategy — determines how aggressively to fetch full text.
 * All media are still attempted; this only affects labeling and priority.
 */

export type MediaStrategy = "open" | "soft_paywall" | "hard_paywall";

export const MEDIA_STRATEGY: Record<string, MediaStrategy> = {
  BBC: "open",
  Guardian: "open",
  NYT: "soft_paywall",
  WP: "soft_paywall",
  WSJ: "hard_paywall",
  Economist: "hard_paywall",
};

export const MEDIA_STRATEGY_LABEL: Record<MediaStrategy, string> = {
  open: "开放",
  soft_paywall: "软付费墙",
  hard_paywall: "硬付费墙",
};

export function getMediaStrategy(media: string): MediaStrategy {
  return MEDIA_STRATEGY[media] ?? "soft_paywall";
}
