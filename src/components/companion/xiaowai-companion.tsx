"use client";

import { useRef, useState, useEffect } from "react";
import { XiaoWaiSVG } from "./xiaowai-svg";
import { XiaoWaiMobile } from "./xiaowai-mobile";
import { useBreathing, useBlink, useEyeTracking, useIsMobile, useDockLeft } from "./companion-hooks";
import { orbContainerStyle, orbHoverStyle, orbModalOpacity } from "./companion-styles";
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
  const [hovering, setHovering] = useState(false);

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

  if (mobile) return <XiaoWaiMobile />;

  return (
    <div
      ref={ref}
      style={{
        ...orbContainerStyle(dockLeft),
        opacity: orbModalOpacity(hasModal),
        ...orbHoverStyle(hovering),
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      aria-label="Companion Orb"
    >
      <XiaoWaiSVG
        breathingScale={breathing}
        eyeDimmed={eyeDimmed}
        pupilOffset={pupil}
        orbState={orbState}
      />
    </div>
  );
}
