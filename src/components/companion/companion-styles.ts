import { EDGE_INSET, Z_INDEX, ORB_SIZE } from "./companion-config";

export const SVG_STYLE: React.CSSProperties = {
  width: "100%", height: "100%", overflow: "visible", position: "absolute", inset: 0,
};

export function orbContainerStyle(dockLeft: boolean): React.CSSProperties {
  return {
    position: "fixed",
    [dockLeft ? "left" : "right"]: EDGE_INSET,
    bottom: EDGE_INSET,
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: "50%",
    zIndex: Z_INDEX,
    cursor: "pointer",
    userSelect: "none",
    background: "radial-gradient(circle at 50% 50%, rgba(10,25,60,0.9) 0%, rgba(5,10,30,0.95) 100%)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1px solid rgba(100,180,255,0.2)",
    boxShadow: "0 0 20px rgba(56,189,248,0.15), 0 8px 24px rgba(0,0,0,0.2)",
    overflow: "hidden",
    transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1), width 0.5s cubic-bezier(0.34,1.56,0.64,1), height 0.5s cubic-bezier(0.34,1.56,0.64,1), border-radius 0.5s cubic-bezier(0.34,1.56,0.64,1)",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}

/** Expanded sizes: hover=120px, click=200px */
export const EXPAND_SIZES = { hover: 120, click: 200 } as const;

export function orbExpandStyle(size: number | null): React.CSSProperties {
  if (!size) return {};
  return {
    width: size, height: size,
    borderRadius: size > 120 ? "16px" : "50%",
  };
}

export function orbModalOpacity(hasModal: boolean): number {
  return hasModal ? 0.25 : 1;
}
