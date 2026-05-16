"use client";

/** Phase 1: XiaoWai Maltese Research Companion — main component. */

import { useRef, useState, useEffect } from "react";
import { XiaoWaiSVG } from "./xiaowai-svg";
import { XiaoWaiMobile } from "./xiaowai-mobile";
import {
  useBreathing, useBlink, useEyeTracking,
  useTimeAtmosphere, useIsMobile, useShouldDockLeft,
} from "./companion-hooks";
import { companionContainerStyle, glowOverrideStyle, getCompanionOpacity } from "./companion-styles";
import { COMPANION_SIZE, COLORS } from "./companion-config";

export function XiaoWaiCompanion() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const dockLeft = useShouldDockLeft();
  const breathingScale = useBreathing();
  const blinkClosed = useBlink();
  const pupilOffset = useEyeTracking(containerRef);
  const atmosphere = useTimeAtmosphere();
  const [hasModal, setHasModal] = useState(false);

  // Detect modal presence in DOM
  useEffect(() => {
    function check() {
      // Modal selectors from the settings page pattern
      const modal = document.querySelector('[class*="fixed inset-0 z-50"]');
      setHasModal(!!modal);
    }
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => obs.disconnect();
  }, []);

  // Mobile: render minimal static version
  if (isMobile) return <XiaoWaiMobile />;

  const opacity = getCompanionOpacity(hasModal);

  return (
    <div
      ref={containerRef}
      style={{
        ...companionContainerStyle(dockLeft),
        opacity,
        transition: "opacity 0.6s ease",
      }}
      aria-label="XiaoWai Research Companion"
      role="img"
    >
      {/* Atmosphere glow layer */}
      {atmosphere.opacity > 0 && (
        <div
          style={{
            position: "absolute",
            left: "50%", top: "50%",
            width: 340, height: 340,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${atmosphere.color} 0%, transparent 70%)`,
            opacity: atmosphere.opacity,
            pointerEvents: "none",
            zIndex: -1,
          }}
        />
      )}

      {/* Night secondary glow (deep blue above) */}
      {atmosphere.isNight && (
        <div
          style={{
            position: "absolute",
            left: "50%", top: "30%",
            width: 320, height: 320,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(45,58,74,0.08) 0%, transparent 70%)",
            opacity: 0.7,
            pointerEvents: "none",
            zIndex: -1,
          }}
        />
      )}

      {/* Character */}
      <XiaoWaiSVG
        breathingScale={breathingScale}
        blinkClosed={blinkClosed}
        pupilOffset={pupilOffset}
        isNight={atmosphere.isNight}
      />
    </div>
  );
}
