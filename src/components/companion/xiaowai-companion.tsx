"use client";

import { useRef, useState, useEffect } from "react";
import { XiaoWaiSVG } from "./xiaowai-svg";
import { XiaoWaiMobile } from "./xiaowai-mobile";
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

  // Close panel on outside click
  useEffect(() => {
    if (!expanded) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setExpanded(false);
    }
    const t = setTimeout(() => document.addEventListener("click", onClick), 100);
    return () => { clearTimeout(t); document.removeEventListener("click", onClick); };
  }, [expanded]);

  if (mobile) return <XiaoWaiMobile />;

  const style = expanded
    ? panelStyle(dockLeft)
    : miniBarStyle(dockLeft);

  return (
    <div
      ref={ref}
      style={{ ...style, opacity: orbModalOpacity(hasModal) }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      aria-label="Scholarly Terminal"
    >
      <XiaoWaiSVG
        breathingScale={breathing}
        eyeDimmed={eyeDimmed}
        pupilOffset={pupil}
        orbState={orbState}
        expanded={expanded}
      />
    </div>
  );
}
