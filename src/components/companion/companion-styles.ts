import { EDGE_INSET, Z_INDEX } from "./companion-config";

export const SVG_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  overflow: "visible",
};

export function containerStyle(dockLeft: boolean): React.CSSProperties {
  return {
    position: "fixed",
    [dockLeft ? "left" : "right"]: EDGE_INSET,
    bottom: EDGE_INSET,
    width: 120,
    height: 120,
    zIndex: Z_INDEX,
    cursor: "default",
    userSelect: "none",
    pointerEvents: "auto",
  };
}

export function modalOpacity(hasModal: boolean): number {
  return hasModal ? 0.3 : 0.88;
}
