"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { XiaoWaiSVG } from "./xiaowai-svg";
import { XiaoWaiMobile } from "./xiaowai-mobile";
import { TerminalPanel } from "./terminal-panel";
import { useBreathing, useBlink, useEyeTracking, useIsMobile, useDockLeft } from "./companion-hooks";
import { miniBarStyle, panelStyle } from "./companion-styles";
import type { OrbState } from "./companion-config";

export function XiaoWaiCompanion() {
  const ref = useRef<HTMLDivElement>(null);
  const mobile = useIsMobile();
  const dockLeft = useDockLeft();
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [expanded, setExpanded] = useState(false);
  const [clicked, setClicked] = useState(false);

  // Animation hooks — stop when expanded (TerminalPanel doesn't need them)
  const animActive = !expanded;
  const breathing = useBreathing(animActive);
  const eyeDimmed = useBlink(animActive);
  const pupil = useEyeTracking(ref, animActive);

  // System events
  useEffect(() => {
    function onState(e: Event) {
      const state = (e as CustomEvent<OrbState>).detail;
      if (state) setOrbState(state);
      if (state === "completed" || state === "error") {
        setTimeout(() => setOrbState("idle"), 4500);
      }
    }
    window.addEventListener("xw-state", onState);
    return () => window.removeEventListener("xw-state", onState);
  }, []);

  // Close panel via Escape key only
  useEffect(() => {
    if (!clicked) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setClicked(false);
        setExpanded(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [clicked]);

  // Click mini bar to expand
  const handleClick = useCallback(() => {
    if (expanded) return;
    setClicked(true);
    setExpanded(true);
  }, [expanded]);

  // Close button
  const handleClose = useCallback(() => {
    setClicked(false);
    setExpanded(false);
  }, []);

  if (mobile) return <XiaoWaiMobile />;

  const style = expanded
    ? panelStyle(dockLeft)
    : miniBarStyle(dockLeft);

  return (
    <div
      ref={ref}
      style={style}
      onClick={handleClick}
      aria-label="Scholarly Terminal"
    >
      {expanded ? (
        <TerminalPanel orbState={orbState} onClose={handleClose} />
      ) : (
        <XiaoWaiSVG
          breathingScale={breathing}
          eyeDimmed={eyeDimmed}
          pupilOffset={pupil}
          orbState={orbState}
          expanded={expanded}
        />
      )}
    </div>
  );
}
