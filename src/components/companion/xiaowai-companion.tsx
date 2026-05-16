"use client";

import { useRef, useState, useEffect } from "react";
import { XiaoWaiSVG } from "./xiaowai-svg";
import { XiaoWaiMobile } from "./xiaowai-mobile";
import { useBreathing, useBlink, useEyeTracking, useIsMobile, useDockLeft } from "./companion-hooks";
import { containerStyle, modalOpacity } from "./companion-styles";
import type { OrbState } from "./companion-config";

export function XiaoWaiCompanion() {
  const ref = useRef<HTMLDivElement>(null);
  const mobile = useIsMobile();
  const dockLeft = useDockLeft();
  const breathing = useBreathing();
  const eyeDimmed = useBlink(); // blink → eye briefly dims
  const pupil = useEyeTracking(ref);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [hasModal, setHasModal] = useState(false);

  // Detect page modals → dim orb
  useEffect(() => {
    const check = () => setHasModal(!!document.querySelector('[class*="fixed inset-0 z-50"]'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => obs.disconnect();
  }, []);

  // ── System event → orb state (lightweight Phase 1 binding) ──
  useEffect(() => {
    function onState(e: Event) {
      const state = (e as CustomEvent<OrbState>).detail;
      if (state) setOrbState(state);
      // Auto-reset to idle after a few seconds
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
      style={{ ...containerStyle(dockLeft), opacity: modalOpacity(hasModal), transition: "opacity 0.6s ease" }}
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
