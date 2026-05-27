"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { XiaoWaiSVG } from "./xiaowai-svg";
import { XiaoWaiMobile } from "./xiaowai-mobile";
import { TerminalPanel } from "./terminal-panel";
import { useBreathing, useBlink, useEyeTracking, useIsMobile, useDockLeft } from "./companion-hooks";
import { miniBarStyle, panelStyle, orbModalOpacity } from "./companion-styles";
import type { OrbState } from "./companion-config";

export function XiaoWaiCompanion() {
  const ref = useRef<HTMLDivElement>(null);
  const mobile = useIsMobile();
  const dockLeft = useDockLeft();
  const breathing = useBreathing();
  const eyeDimmed = useBlink();
  const pupil = useEyeTracking(ref);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [hasModal, setHasModal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [clicked, setClicked] = useState(false); // Click-to-lock state

  // Modal detection
  useEffect(() => {
    const check = () => setHasModal(!!document.querySelector('[class*="fixed inset-0 z-50"]'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => obs.disconnect();
  }, []);

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

  // Close panel on outside click (only when clicked-open)
  useEffect(() => {
    if (!clicked) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setClicked(false);
        setExpanded(false);
      }
    }
    const t = setTimeout(() => document.addEventListener("click", onClick), 100);
    return () => { clearTimeout(t); document.removeEventListener("click", onClick); };
  }, [clicked]);

  // Click handler — toggle lock
  const handleClick = useCallback(() => {
    if (clicked) {
      // Already locked, unlock
      setClicked(false);
      setExpanded(false);
    } else {
      // Lock open
      setClicked(true);
      setExpanded(true);
    }
  }, [clicked]);

  // Hover handlers — only work when not clicked-locked
  const handleMouseEnter = useCallback(() => {
    if (!clicked) setExpanded(true);
  }, [clicked]);

  const handleMouseLeave = useCallback(() => {
    if (!clicked) setExpanded(false);
  }, [clicked]);

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
      style={{ ...style, opacity: orbModalOpacity(hasModal) }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
