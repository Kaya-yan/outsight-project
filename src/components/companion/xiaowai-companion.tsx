"use client";

import { useRef, useState, useEffect } from "react";
import { XiaoWaiSVG } from "./xiaowai-svg";
import { XiaoWaiMobile } from "./xiaowai-mobile";
import { useBreathing, useBlink, useEyeTracking, useIsMobile, useDockLeft } from "./companion-hooks";
import { orbContainerStyle, orbExpandStyle, EXPAND_SIZES, orbModalOpacity } from "./companion-styles";
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
  const [expanded, setExpanded] = useState<"hover" | "click" | null>(null);

  // Modal detection
  useEffect(() => {
    const check = () => setHasModal(!!document.querySelector('[class*="fixed inset-0 z-50"]'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => obs.disconnect();
  }, []);

  // System event → orb state
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

  // Close click-expand on outside click
  useEffect(() => {
    if (expanded !== "click") return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setExpanded(null);
      }
    }
    // Delay add to avoid the same click that opened it
    const t = setTimeout(() => document.addEventListener("click", onClick), 100);
    return () => { clearTimeout(t); document.removeEventListener("click", onClick); };
  }, [expanded]);

  if (mobile) return <XiaoWaiMobile />;

  const expandSize = expanded === "click" ? EXPAND_SIZES.click : expanded === "hover" ? EXPAND_SIZES.hover : null;

  return (
    <div
      ref={ref}
      style={{
        ...orbContainerStyle(dockLeft),
        opacity: orbModalOpacity(hasModal),
        ...orbExpandStyle(expandSize),
      }}
      onMouseEnter={() => { if (!expanded) setExpanded("hover"); }}
      onMouseLeave={() => { if (expanded === "hover") setExpanded(null); }}
      onClick={(e) => {
        e.stopPropagation();
        setExpanded((p) => p === "click" ? null : "click");
      }}
      aria-label="Night Earth Orb"
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
