import { RESEARCH_PERIODS } from "@/lib/constants";

// Research period boundaries — single source of truth
export const RESEARCH_START_DATE = "2022-10-01";
export const RESEARCH_END_DATE = "2025-12-31";

// Future date guard: reject articles dated more than 7 days in the future
const FUTURE_DATE_BUFFER_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Parse a period value like "2022.10-2023.03" into its date boundaries.
 */
function parsePeriodBounds(periodValue: string): { start: Date; end: Date } | null {
  const match = periodValue.match(/^(\d{4})\.(\d{2})-(\d{4})\.(\d{2})$/);
  if (!match) return null;
  const start = new Date(`${match[1]}-${match[2]}-01`);
  const endYear = parseInt(match[3], 10);
  const endMonth = parseInt(match[4], 10);
  const end = new Date(endYear, endMonth, 0); // last day of end month
  return { start, end };
}

// Pre-compute period boundaries for fast lookup
const PERIOD_BOUNDARIES = RESEARCH_PERIODS
  .map((p) => ({ value: p.value, ...parsePeriodBounds(p.value) }))
  .filter((p) => p.start && p.end) as Array<{ value: string; start: Date; end: Date }>;

/**
 * Automatically determine which research period a publish_date belongs to.
 * Returns the period value string (e.g. "2023.04-2023.09") or null if the date
 * doesn't fall within any research period.
 */
export function autoPeriod(publishDate: string | null | undefined): string | null {
  if (!publishDate) return null;
  const d = new Date(publishDate);
  if (isNaN(d.getTime())) return null;

  for (const period of PERIOD_BOUNDARIES) {
    if (d >= period.start && d <= period.end) {
      return period.value;
    }
  }
  return null;
}

/**
 * Check whether a publish_date falls within the research period [2022-10-01, 2025-12-31].
 * Also rejects dates more than 7 days in the future (data quality guard).
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
  const now = new Date();
  const futureLimit = new Date(now.getTime() + FUTURE_DATE_BUFFER_MS);

  if (dateStr < RESEARCH_START_DATE) {
    return { valid: false, reason: `date_too_old: ${dateStr} < ${RESEARCH_START_DATE}` };
  }

  if (dateStr > RESEARCH_END_DATE) {
    return { valid: false, reason: `date_too_new: ${dateStr} > ${RESEARCH_END_DATE}` };
  }

  if (d > futureLimit) {
    return { valid: false, reason: `date_in_future: ${dateStr} is >7 days from now` };
  }

  return { valid: true };
}
