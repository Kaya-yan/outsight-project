"use client";

import { useRef, useState, useEffect } from "react";
import { XiaoWaiSVG } from "./xiaowai-svg";
import { XiaoWaiMobile } from "./xiaowai-mobile";
import { useBreathing, useBlink, useEyeTracking, useHeadTilt, useIsMobile, useDockLeft } from "./companion-hooks";
import { containerStyle, modalOpacity } from "./companion-styles";

export function XiaoWaiCompanion() {
  const ref = useRef<HTMLDivElement>(null);
  const mobile = useIsMobile();
  const dockLeft = useDockLeft();
  const breathing = useBreathing();
  const blink = useBlink();
  const pupil = useEyeTracking(ref);
  const tilt = useHeadTilt();
  const [hasModal, setHasModal] = useState(false);

  useEffect(() => {
    const check = () => setHasModal(!!document.querySelector('[class*="fixed inset-0 z-50"]'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => obs.disconnect();
  }, []);

  if (mobile) return <XiaoWaiMobile />;

  return (
    <div
      ref={ref}
      style={{ ...containerStyle(dockLeft), opacity: modalOpacity(hasModal), transition: "opacity 0.6s ease" }}
      aria-label="XiaoWai"
    >
      <XiaoWaiSVG
        breathingScale={breathing}
        blinkClosed={blink}
        pupilOffset={pupil}
        headTilt={tilt}
      />
    </div>
  );
}
