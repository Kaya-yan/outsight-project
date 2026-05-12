import { RESEARCH_PERIODS } from "@/lib/constants";

// Derived from RESEARCH_PERIODS: min start = 2022-10-01, max end = 2024-12-31
export const RESEARCH_START_DATE = "2022-10-01";
export const RESEARCH_END_DATE = "2024-12-31";

/**
 * Check whether a publish_date falls within the research period [2022-10-01, 2024-12-31].
 *
 * Null/undefined/unparseable dates pass the check but return a warning reason
 * so callers can log the anomaly.
 */
export function isWithinResearchPeriod(publishDate: string | null | undefined): {
  valid: boolean;
  reason?: string;
} {
  if (!publishDate) {
    return { valid: true, reason: "null_date_allowed_with_warning" };
  }

  const d = new Date(publishDate);
  if (isNaN(d.getTime())) {
    return { valid: true, reason: "unparseable_date_allowed_with_warning" };
  }

  const dateStr = d.toISOString().split("T")[0];

  if (dateStr < RESEARCH_START_DATE) {
    return { valid: false, reason: `before_research_period: ${dateStr} < ${RESEARCH_START_DATE}` };
  }

  if (dateStr > RESEARCH_END_DATE) {
    return { valid: false, reason: `after_research_period: ${dateStr} > ${RESEARCH_END_DATE}` };
  }

  return { valid: true };
}
