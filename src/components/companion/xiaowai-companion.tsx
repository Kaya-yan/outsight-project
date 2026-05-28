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
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [hasModal, setHasModal] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [clicked, setClicked] = useState(false);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imeActiveRef = useRef(false);

  // Animation hooks — stop when expanded (TerminalPanel doesn't need them)
  const animActive = !expanded;
  const breathing = useBreathing(animActive);
  const eyeDimmed = useBlink(animActive);
  const pupil = useEyeTracking(ref, animActive);

  // Modal detection
  useEffect(() => {
    const check = () => setHasModal(!!document.querySelector('[class*="fixed inset-0 z-50"]'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { childList: true, subtree: true });
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

  // Close panel on outside mousedown — skip when IME is composing
  useEffect(() => {
    if (!clicked) return;

    function onMouseDown(e: MouseEvent) {
      // Don't collapse when IME candidate window is active
      if (imeActiveRef.current) return;
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setClicked(false);
        setExpanded(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setClicked(false);
        setExpanded(false);
      }
    }

    const t = setTimeout(() => {
      document.addEventListener("mousedown", onMouseDown);
      document.addEventListener("keydown", onKeyDown);
    }, 100);

    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }
    };
  }, [clicked]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (expanded) return;
    setClicked(true);
    setExpanded(true);
  }, [expanded]);

  const handleMouseEnter = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (!clicked) setExpanded(true);
  }, [clicked]);

  const handleMouseLeave = useCallback(() => {
    if (clicked) return;
    leaveTimerRef.current = setTimeout(() => {
      setExpanded(false);
    }, 300);
  }, [clicked]);

  const handleClose = useCallback(() => {
    setClicked(false);
    setExpanded(false);
  }, []);

  const handleIMEChange = useCallback((active: boolean) => {
    imeActiveRef.current = active;
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
        <TerminalPanel orbState={orbState} onClose={handleClose} onIMEChange={handleIMEChange} />
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
