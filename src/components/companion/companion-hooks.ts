import { useEffect, useRef, useState, useCallback } from "react";
import { TIMING, MOBILE_BREAKPOINT, LEFT_DOCK_PAGES } from "./companion-config";

// ── breathing: scale 1.0 ↔ 1.03 ──
export function useBreathing(): number {
  const [s, setS] = useState(1);
  const rf = useRef(0);

  useEffect(() => {
    let ok = true;
    const t0 = performance.now();
    function tick(now: number) {
      if (!ok) return;
      const p = ((now - t0) % TIMING.breathingCycle) / TIMING.breathingCycle;
      setS(1 + Math.sin(p * Math.PI * 2) * 0.03);
      rf.current = requestAnimationFrame(tick);
    }
    rf.current = requestAnimationFrame(tick);
    return () => { ok = false; cancelAnimationFrame(rf.current); };
  }, []);

  return s;
}

// ── blink: random interval, 200ms closed ──
export function useBlink(): boolean {
  const [closed, setClosed] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>();

  const next = useCallback(() => {
    const d = TIMING.blinkMin + Math.random() * (TIMING.blinkMax - TIMING.blinkMin);
    t.current = setTimeout(() => {
      setClosed(true);
      setTimeout(() => setClosed(false), TIMING.blinkDuration);
      next();
    }, d);
  }, []);

  useEffect(() => { next(); return () => clearTimeout(t.current); }, [next]);
  return closed;
}

// ── eye tracking: rAF, max 3px, ~300ms delay ──
export function useEyeTracking(ref: React.RefObject<HTMLElement | null>) {
  const [off, setOff] = useState({ dx: 0, dy: 0 });
  const cur = useRef({ dx: 0, dy: 0 });
  const tgt = useRef({ dx: 0, dy: 0 });
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth < MOBILE_BREAKPOINT) return;
    let ok = true;

    const mv = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", mv, { passive: true });

    function tick() {
      if (!ok) return;
      const el = ref.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.35;
        const dist = Math.hypot(mouse.current.x - cx, mouse.current.y - cy);
        if (dist < 220) {
          tgt.current.dx = Math.max(-TIMING.pupilMaxOffset, Math.min(TIMING.pupilMaxOffset, (mouse.current.x - cx) * 0.018));
          tgt.current.dy = Math.max(-TIMING.pupilMaxOffset, Math.min(TIMING.pupilMaxOffset, (mouse.current.y - cy) * 0.018));
        } else {
          tgt.current.dx = 0; tgt.current.dy = 0;
        }
      }
      const e = 0.07;
      cur.current.dx += (tgt.current.dx - cur.current.dx) * e;
      cur.current.dy += (tgt.current.dy - cur.current.dy) * e;
      setOff({ dx: Math.round(cur.current.dx * 100) / 100, dy: Math.round(cur.current.dy * 100) / 100 });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return () => { ok = false; window.removeEventListener("mousemove", mv); };
  }, [ref]);

  return off;
}

// ── head tilt: random ±5°, 1.5s ──
export function useHeadTilt(): number {
  const [deg, setDeg] = useState(0);
  const t = useRef<ReturnType<typeof setTimeout>>();

  const next = useCallback(() => {
    const d = TIMING.tiltMin + Math.random() * (TIMING.tiltMax - TIMING.tiltMin);
    t.current = setTimeout(() => {
      setDeg((Math.random() > 0.5 ? 1 : -1) * TIMING.tiltAngle);
      setTimeout(() => setDeg(0), TIMING.tiltDuration);
      next();
    }, d);
  }, []);

  useEffect(() => { next(); return () => clearTimeout(t.current); }, [next]);
  return deg;
}

// ── mobile detect ──
export function useIsMobile(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const c = () => setM(window.innerWidth < MOBILE_BREAKPOINT);
    c(); window.addEventListener("resize", c); return () => window.removeEventListener("resize", c);
  }, []);
  return m;
}

// ── dock left for certain pages ──
export function useDockLeft(): boolean {
  const [l, setL] = useState(false);
  useEffect(() => {
    const c = () => setL(LEFT_DOCK_PAGES.some((p) => location.pathname.startsWith(p)));
    c(); window.addEventListener("popstate", c); return () => window.removeEventListener("popstate", c);
  }, []);
  return l;
}
