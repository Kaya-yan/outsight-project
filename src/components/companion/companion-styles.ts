/** Phase 1: Companion styles — pure TS, zero JSX. */

import { EDGE_INSET, Z_INDEX } from "./companion-config";

// Filter ID constant (filter JSX lives in xiaowai-svg.tsx)
export const HAND_DRAWN_FILTER_ID = "hand-drawn-outline";

// ============================================================
// Companion container positioning
// ============================================================

export function companionContainerStyle(dockLeft: boolean): React.CSSProperties {
  return {
    position: "fixed",
    [dockLeft ? "left" : "right"]: EDGE_INSET,
    bottom: EDGE_INSET,
    width: 120,
    height: 150,
    zIndex: Z_INDEX,
    cursor: "default",
    userSelect: "none",
    pointerEvents: "auto",
    // Atmosphere glow handled by ::after pseudo-element via CSS-in-JS
  };
}

// ============================================================
// Atmosphere glow (time-based, applied via className)
// ============================================================

export function glowOverrideStyle(glowColor: string, glowOpacity: number): React.CSSProperties {
  return {
    // Inline style for dynamic glow
    // The ::after pseudo-element is defined in global CSS
    ["--glow-color" as string]: glowColor,
    ["--glow-opacity" as string]: String(glowOpacity),
  };
}

// ============================================================
// Shared SVG props
// ============================================================

export const SVG_CONTAINER_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  overflow: "visible",
};

// ============================================================
// Modal-aware opacity
// ============================================================

export function getCompanionOpacity(hasModal: boolean): number {
  return hasModal ? 0.3 : 0.88;
}
