/** Phase 1: Static character configuration — all constants in one place. */

/** Layout */
export const COMPANION_SIZE = { width: 100, height: 130 } as const;
export const VIEWBOX = "0 0 200 240";
export const EDGE_INSET = 24; // px from viewport edge
export const Z_INDEX = 100;
export const Z_INDEX_MODAL = 900; // companion drops below modals

/** Colors — matching v3 design spec */
export const COLORS = {
  body: "#F9F7F2",
  earInner: "#F5EFE6",
  outline: "#3D4446",
  nose: "#4A4A4A",
  pupil: "#2D3436",
  iris: "#4A90A4",
  eyeWhite: "#FFFFFF",
  glasses: "rgba(74,144,164,0.30)",
  scarf: "#4A90A4",
  scarfStripe: "#5DAD93",
  shadow: "rgba(45,52,54,0.05)",
  pawPad: "#F2EDE4",
  furWisp: "rgba(61,68,70,0.25)",
} as const;

/** Animation timing (ms) */
export const TIMING = {
  breathingCycle: 4200,
  blinkIntervalMin: 3000,
  blinkIntervalMax: 9000,
  blinkDuration: 180,
  scarfFloatCycle: 8000,
  furWispCycle: 5000,
  // Eye tracking
  eyeTrackingDelay: 280,
  pupilMaxOffset: 4,
  // Atmosphere transition: 15 min
  glowTransition: 900_000,
} as const;

/** Which pages dock left vs right */
export const LEFT_DOCK_PAGES = ["/coding"] as const;

/** Mobile breakpoint */
export const MOBILE_BREAKPOINT = 1024;
