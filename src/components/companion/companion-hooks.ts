/** Phase 1: Companion hooks — breathing, blink, eye tracking, time atmosphere. */

import { useEffect, useRef, useState, useCallback } from "react";
import { TIMING, MOBILE_BREAKPOINT } from "./companion-config";

// ============================================================
// useBreathing — gentle body scale oscillation
// ============================================================

export function useBreathing(): number {
  const [scale, setScale] = useState(1);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    let running = true;
    const start = performance.now();

    function tick(now: number) {
      if (!running) return;
      const elapsed = (now - start) % TIMING.breathingCycle;
      const t = elapsed / TIMING.breathingCycle; // 0..1
      const s = 1 + Math.sin(t * Math.PI * 2) * 0.015; // 1.000 ~ 1.015
      setScale(s);
      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(frameRef.current); };
  }, []);

  return scale;
}

// ============================================================
// useBlink — random blink state (open / closed)
// ============================================================

export function useBlink(): boolean {
  const [closed, setClosed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const scheduleNext = useCallback(() => {
    const delay = TIMING.blinkIntervalMin + Math.random() * (TIMING.blinkIntervalMax - TIMING.blinkIntervalMin);
    timerRef.current = setTimeout(() => {
      setClosed(true);
      setTimeout(() => setClosed(false), TIMING.blinkDuration);
      scheduleNext();
    }, delay);
  }, []);

  useEffect(() => {
    scheduleNext();
    return () => clearTimeout(timerRef.current);
  }, [scheduleNext]);

  return closed;
}

// ============================================================
// useEyeTracking — pupil follows mouse with lazy easing
// ============================================================

export interface PupilOffset { dx: number; dy: number }

export function useEyeTracking(containerRef: React.RefObject<HTMLElement | null>): PupilOffset {
  const offsetRef = useRef<PupilOffset>({ dx: 0, dy: 0 });
  const [offset, setOffset] = useState<PupilOffset>({ dx: 0, dy: 0 });
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ dx: 0, dy: 0 });

  useEffect(() => {
    // Skip on mobile
    if (typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT) return;

    let frame: number;
    let running = true;

    const onMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMouse, { passive: true });

    function tick() {
      if (!running) return;
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height * 0.32; // eyes are in upper portion
        const dist = Math.hypot(mouseRef.current.x - cx, mouseRef.current.y - cy);

        if (dist < 250) {
          targetRef.current.dx = Math.max(-TIMING.pupilMaxOffset, Math.min(TIMING.pupilMaxOffset, (mouseRef.current.x - cx) * 0.018));
          targetRef.current.dy = Math.max(-TIMING.pupilMaxOffset, Math.min(TIMING.pupilMaxOffset, (mouseRef.current.y - cy) * 0.018));
        } else {
          targetRef.current.dx = 0;
          targetRef.current.dy = 0;
        }
      }

      // Ease toward target (~280ms)
      const ease = 0.07;
      offsetRef.current.dx += (targetRef.current.dx - offsetRef.current.dx) * ease;
      offsetRef.current.dy += (targetRef.current.dy - offsetRef.current.dy) * ease;

      setOffset({ dx: offsetRef.current.dx, dy: offsetRef.current.dy });
      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMouse);
    };
  }, [containerRef]);

  return offset;
}

// ============================================================
// useTimeAtmosphere — returns glow color+opacity based on hour
// ============================================================

export interface AtmosphereGlow {
  color: string;
  opacity: number;
  isNight: boolean;
}

export function useTimeAtmosphere(): AtmosphereGlow {
  const [glow, setGlow] = useState<AtmosphereGlow>({ color: "transparent", opacity: 0, isNight: false });

  useEffect(() => {
    function update() {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 10)       setGlow({ color: "#F5E6C8", opacity: 0.12, isNight: false });
      else if (hour >= 10 && hour < 17)  setGlow({ color: "transparent", opacity: 0, isNight: false });
      else if (hour >= 17 && hour < 20)  setGlow({ color: "#F0D5B0", opacity: 0.10, isNight: false });
      else                               setGlow({ color: "#F5D5A0", opacity: 0.10, isNight: true });
    }
    update();
    const timer = setInterval(update, 600_000); // every 10 min
    return () => clearInterval(timer);
  }, []);

  return glow;
}

// ============================================================
// useIsMobile — responsive breakpoint
// ============================================================

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    function check() { setMobile(window.innerWidth < MOBILE_BREAKPOINT); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return mobile;
}

// ============================================================
// useShouldDockLeft — per-page docking
// ============================================================

import { LEFT_DOCK_PAGES } from "./companion-config";

export function useShouldDockLeft(): boolean {
  const [dockLeft, setDockLeft] = useState(false);

  useEffect(() => {
    function check() {
      const path = window.location.pathname;
      setDockLeft(LEFT_DOCK_PAGES.some((p) => path.startsWith(p)));
    }
    check();
    // Re-check on navigation (Next.js soft nav doesn't always fire popstate;
    // we use a MutationObserver on the URL or rely on the parent re-render)
    const onPop = () => check();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return dockLeft;
}
