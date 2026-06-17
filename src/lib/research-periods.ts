export const RESEARCH_PERIOD_DEFS = [
  {
    value: "2022.10-2023.03",
    label: "2022.10 - 2023.03",
    startDate: "2022-10-01",
    endDate: "2023-03-31",
    timespan: "20221001000000-20230331235959",
  },
  {
    value: "2023.04-2023.09",
    label: "2023.04 - 2023.09",
    startDate: "2023-04-01",
    endDate: "2023-09-30",
    timespan: "20230401000000-20230930235959",
  },
  {
    value: "2023.10-2024.03",
    label: "2023.10 - 2024.03",
    startDate: "2023-10-01",
    endDate: "2024-03-31",
    timespan: "20231001000000-20240331235959",
  },
  {
    value: "2024.04-2024.09",
    label: "2024.04 - 2024.09",
    startDate: "2024-04-01",
    endDate: "2024-09-30",
    timespan: "20240401000000-20240930235959",
  },
  {
    value: "2024.10-2024.12",
    label: "2024.10 - 2024.12",
    startDate: "2024-10-01",
    endDate: "2024-12-31",
    timespan: "20241001000000-20241231235959",
  },
  {
    value: "2025.01-2025.06",
    label: "2025.01 - 2025.06",
    startDate: "2025-01-01",
    endDate: "2025-06-30",
    timespan: "20250101000000-20250630235959",
  },
  {
    value: "2025.07-2025.12",
    label: "2025.07 - 2025.12",
    startDate: "2025-07-01",
    endDate: "2025-12-31",
    timespan: "20250701000000-20251231235959",
  },
] as const;

export type ResearchPeriodValue = typeof RESEARCH_PERIOD_DEFS[number]["value"];

export const RESEARCH_PERIODS: Array<{ value: ResearchPeriodValue; label: string }> = RESEARCH_PERIOD_DEFS.map(
  ({ value, label }) => ({ value, label }),
);

export const GDELT_RESEARCH_PERIODS: Array<{ value: ResearchPeriodValue; timespan: string }> = RESEARCH_PERIOD_DEFS.map(
  ({ value, timespan }) => ({ value, timespan }),
);

export const GDELT_PERIOD_MAP: Record<ResearchPeriodValue, string> = Object.fromEntries(
  RESEARCH_PERIOD_DEFS.map(({ value, timespan }) => [value, timespan]),
) as Record<ResearchPeriodValue, string>;
