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
  /** Earth self-rotation: idle */
  rotationIdle: 80,
  /** Earth self-rotation: searching (faster) */
  rotationSearch: 20,
  /** Earth self-rotation: waiting (slower) */
  rotationWait: 200,
  /** City light breathing cycle */
  cityBreath: 3,
} as const;

export type OrbState = "idle" | "searching" | "completed" | "error" | "waiting";

export const STATE_COLORS = {
  idle:     { core: "#0ea5e9", scan: "rgba(14,165,233,0)",    continent: "rgba(40,80,140,0.35)", outline: "rgba(80,160,220,0.25)" },
  searching:{ core: "#38bdf8", scan: "rgba(56,189,248,0.6)",  continent: "rgba(50,100,170,0.40)", outline: "rgba(100,180,240,0.35)" },
  completed:{ core: "#22c55e", scan: "rgba(34,197,94,0)",     continent: "rgba(34,197,94,0.30)", outline: "rgba(34,197,94,0.40)" },
  error:    { core: "#f97316", scan: "rgba(249,115,22,0)",    continent: "rgba(180,80,60,0.30)", outline: "rgba(200,100,70,0.30)" },
  waiting:  { core: "#64748b", scan: "rgba(100,116,139,0)",   continent: "rgba(30,60,100,0.25)", outline: "rgba(60,100,140,0.18)" },
} as const;
