export const EDGE_INSET = 28;
export const Z_INDEX = 100;
export const MOBILE_BREAKPOINT = 1024;
export const LEFT_DOCK_PAGES = ["/coding"] as const;

export const TIMING = {
  breathingCycle: 4200,       // orb scale+glow oscillation
  blinkMin: 4000,
  blinkMax: 10000,
  blinkDuration: 250,         // eye briefly dims, not "blink"
  pupilMaxOffset: 4,
  eyeDelay: 320,
  stateTransition: 800,       // ms for color/ring transitions
} as const;

/** Orb state enums passed from parent */
export type OrbState = "idle" | "searching" | "completed" | "error" | "waiting";

export const ORB_COLORS: Record<OrbState, { core: string; ring: string; glow: string }> = {
  idle:     { core: "#4A90A4", ring: "rgba(74,144,164,0.25)", glow: "rgba(74,144,164,0.10)" },
  searching:{ core: "#5B9FBF", ring: "rgba(74,144,164,0.45)", glow: "rgba(74,144,164,0.16)" },
  completed:{ core: "#5DAD93", ring: "rgba(93,173,147,0.35)", glow: "rgba(93,173,147,0.14)" },
  error:    { core: "#E67E22", ring: "rgba(230,126,34,0.35)",  glow: "rgba(230,126,34,0.12)" },
  waiting:  { core: "#7A8A94", ring: "rgba(122,138,148,0.18)", glow: "rgba(122,138,148,0.06)" },
} as const;
