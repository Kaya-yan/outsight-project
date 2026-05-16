export const EDGE_INSET = 24;
export const Z_INDEX = 50;
export const MOBILE_BREAKPOINT = 1024;
export const LEFT_DOCK_PAGES = ["/coding"] as const;

export const TIMING = {
  breathingCycle: 6000,
  blinkMin: 4000,
  blinkMax: 10000,
  blinkDuration: 250,
  pupilMaxOffset: 2,
  eyeDelay: 320,
  cursorBlink: 1500,
  fadeIn: 300,
  expand: 400,
} as const;

/** Terminal sizing */
export const TERMINAL = {
  mini: { w: 280, h: 44 },
  panel: { w: 380, h: 300 },
  font: "'JetBrains Mono', 'Fira Code', 'Consolas', 'SF Mono', monospace",
  fontSize: 12,
  lineHeight: 1.5,
  borderRadius: 8,
  panelRadius: 10,
} as const;

export type OrbState = "idle" | "searching" | "completed" | "error" | "waiting";

/** State → display label */
export const STATE_LABEL: Record<OrbState, string> = {
  idle: "standby", searching: "crawling", completed: "synced", error: "error", waiting: "pause",
};

/** State → color */
export const STATE_COLOR: Record<OrbState, string> = {
  idle: "#38bdf8", searching: "#f59e0b", completed: "#10b981", error: "#f43f5e", waiting: "#94a3b8",
};

/** Daily quotes (indexed by day-of-month) */
export const QUOTES = [
  "Progress, not perfection.",
  "Small steps every day.",
  "Consistency beats intensity.",
  "Trust the process.",
  "Data tells the story.",
  "Frameworks build clarity.",
  "Every article counts.",
  "Patterns emerge from patience.",
  "The archive is alive.",
  "Keep the signal clear.",
  "Discourse is a journey.",
  "Index the world.",
  "Read widely, code deeply.",
  "Stay curious, stay humble.",
  "Your potential is infinite.",
];

/** Placeholder data when real API unavailable */
export const PLACEHOLDER = {
  corpusTotal: 479,
  todayNew: 23,
  progress: 0,
  pendingJobs: 12,
  processingJobs: 3,
  completedToday: 8,
  health: 97,
  stability: "stable" as const,
  driftIndex: 0.18,
  driftLevel: "low" as const,
  signalCount: 2,
  signalNames: "framing, sentiment",
} as const;
