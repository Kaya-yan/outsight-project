export const EDGE_INSET = 24;
export const Z_INDEX = 50;
export const ORB_SIZE = 56;
export const MOBILE_BREAKPOINT = 1024;
export const LEFT_DOCK_PAGES = ["/coding"] as const;

export const TIMING = {
  breathingCycle: 4200,
  blinkMin: 4000,
  blinkMax: 10000,
  blinkDuration: 250,
  pupilMaxOffset: 3,
  eyeDelay: 320,
  stateTransition: 800,
} as const;

export type OrbState = "idle" | "searching" | "completed" | "error" | "waiting";

export const ORB_COLORS: Record<OrbState, { core: string; ring: string }> = {
  idle:     { core: "#0ea5e9", ring: "rgba(14,165,233,0.25)" },
  searching:{ core: "#38bdf8", ring: "rgba(56,189,248,0.40)" },
  completed:{ core: "#22c55e", ring: "rgba(34,197,94,0.35)" },
  error:    { core: "#f97316", ring: "rgba(249,115,22,0.35)" },
  waiting:  { core: "#64748b", ring: "rgba(100,116,139,0.18)" },
} as const;
