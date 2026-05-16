import { EDGE_INSET, Z_INDEX, ORB_SIZE } from "./companion-config";

export const SVG_STYLE: React.CSSProperties = {
  width: "100%", height: "100%", overflow: "visible",
};

/** Outer glass orb container */
export function orbContainerStyle(dockLeft: boolean): React.CSSProperties {
  return {
    position: "fixed",
    [dockLeft ? "left" : "right"]: EDGE_INSET,
    bottom: EDGE_INSET,
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: "50%",
    zIndex: Z_INDEX,
    cursor: "default",
    userSelect: "none",
    pointerEvents: "auto",
    // Dark glass
    background: "rgba(15, 23, 42, 0.75)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255,255,255,0.05)",
    transition: "transform 0.3s ease, background 0.3s ease, opacity 0.6s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}

export function orbHoverStyle(hovering: boolean): React.CSSProperties {
  return hovering ? {
    transform: "scale(1.05)",
    background: "rgba(15, 23, 42, 0.85)",
  } : {};
}

export function orbModalOpacity(hasModal: boolean): number {
  return hasModal ? 0.25 : 1;
}
