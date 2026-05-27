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
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderCountRef = useRef(0);

  // ── DEBUG: Log every render ──
  renderCountRef.current++;
  console.log(`[Terminal] Render #${renderCountRef.current}: expanded=${expanded}, clicked=${clicked}, hasModal=${hasModal}, orbState=${orbState}`);

  // Modal detection
  useEffect(() => {
    const check = () => {
      const found = !!document.querySelector('[class*="fixed inset-0 z-50"]');
      setHasModal((prev) => {
        if (prev !== found) {
          console.log(`[Terminal] Modal detection changed: ${prev} → ${found}`);
        }
        return found;
      });
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => obs.disconnect();
  }, []);

  // System events
  useEffect(() => {
    function onState(e: Event) {
      const state = (e as CustomEvent<OrbState>).detail;
      console.log(`[Terminal] xw-state event: ${state}`);
      if (state) setOrbState(state);
      if (state === "completed" || state === "error") {
        setTimeout(() => setOrbState("idle"), 4500);
      }
    }
    window.addEventListener("xw-state", onState);
    return () => window.removeEventListener("xw-state", onState);
  }, []);

  // Close panel on outside mousedown (more reliable than click for input scenarios)
  useEffect(() => {
    console.log(`[Terminal] useEffect[clicked] fired: clicked=${clicked}, expanded=${expanded}`);
    if (!clicked) return;

    function onMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const contains = ref.current?.contains(target) ?? false;
      console.log(`[Terminal] mousedown target: tagName=${target.tagName}, className="${target.className}", id="${target.id}", contains=${contains}`);
      // Check if the click target is outside the terminal panel
      if (ref.current && !ref.current.contains(target)) {
        console.log("[Terminal] setExpanded(false) called from: onMouseDown (outside click)");
        setClicked(false);
        setExpanded(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      // Only Escape key closes the terminal
      if (e.key === "Escape") {
        console.log("[Terminal] setExpanded(false) called from: onKeyDown (Escape)");
        setClicked(false);
        setExpanded(false);
      }
    }

    // Delay adding listener to prevent immediate trigger
    const t = setTimeout(() => {
      console.log("[Terminal] Adding document mousedown/keydown listeners");
      document.addEventListener("mousedown", onMouseDown);
      document.addEventListener("keydown", onKeyDown);
    }, 100);

    return () => {
      console.log("[Terminal] useEffect[clicked] cleanup: removing listeners");
      clearTimeout(t);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      if (leaveTimerRef.current) {
        clearTimeout(leaveTimerRef.current);
      }
    };
  }, [clicked]);

  // Click handler — only toggle when clicking the mini bar (not expanded panel)
  const handleClick = useCallback((e: React.MouseEvent) => {
    console.log(`[Terminal] handleClick: expanded=${expanded}, target=${(e.target as HTMLElement).tagName}`);
    // If expanded, don't toggle on internal clicks
    if (expanded) return;
    // Lock open
    console.log("[Terminal] setExpanded(true) called from: handleClick");
    setClicked(true);
    setExpanded(true);
  }, [expanded]);

  // Hover handlers — only work when not clicked-locked
  const handleMouseEnter = useCallback(() => {
    console.log(`[Terminal] handleMouseEnter: clicked=${clicked}, leaveTimer=${!!leaveTimerRef.current}`);
    // Cancel any pending leave timer
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (!clicked) {
      console.log("[Terminal] setExpanded(true) called from: handleMouseEnter");
      setExpanded(true);
    }
  }, [clicked]);

  const handleMouseLeave = useCallback(() => {
    console.log(`[Terminal] handleMouseLeave: clicked=${clicked}`);
    // Don't close if clicked-locked
    if (clicked) return;
    // Add delay to prevent accidental close during typing
    leaveTimerRef.current = setTimeout(() => {
      console.log("[Terminal] setExpanded(false) called from: handleMouseLeave (delayed 300ms)");
      setExpanded(false);
    }, 300);
  }, [clicked]);

  const handleClose = useCallback(() => {
    console.log("[Terminal] setExpanded(false) called from: handleClose");
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
