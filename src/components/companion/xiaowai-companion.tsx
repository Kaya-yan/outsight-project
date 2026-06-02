"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { XiaoWaiSVG } from "./xiaowai-svg";
import { XiaoWaiMobile } from "./xiaowai-mobile";
import { TerminalPanel } from "./terminal-panel";
import { useBreathing, useBlink, useEyeTracking, useIsMobile } from "./companion-hooks";
import { miniBarStyle, panelStyle } from "./companion-styles";
import { TERMINAL } from "./companion-config";
import type { OrbState } from "./companion-config";

const POS_KEY = "companion-position";

interface Position { x: number; y: number }

function loadPosition(): Position | null {
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const pos = JSON.parse(raw) as Position;
    if (typeof pos.x !== "number" || typeof pos.y !== "number") return null;
    return pos;
  } catch { return null; }
}

function savePosition(pos: Position) {
  try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
}

function clampPosition(pos: Position, w: number, h: number): Position {
  return {
    x: Math.max(0, Math.min(pos.x, window.innerWidth - w)),
    y: Math.max(0, Math.min(pos.y, window.innerHeight - h)),
  };
}

export function XiaoWaiCompanion() {
  const ref = useRef<HTMLDivElement>(null);
  const mobile = useIsMobile();
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [expanded, setExpanded] = useState(false);

  // Drag state
  const [position, setPosition] = useState<Position | null>(null);
  const positionRef = useRef<Position | null>(null);
  const dragState = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number; dragging: boolean } | null>(null);
  const hasDragged = useRef(false);

  // Keep ref in sync with state
  useEffect(() => { positionRef.current = position; }, [position]);

  // Load saved position on mount
  useEffect(() => {
    const saved = loadPosition();
    if (saved) setPosition(saved);
  }, []);

  // Clamp position on resize
  useEffect(() => {
    function onResize() {
      setPosition((prev) => {
        if (!prev) return prev;
        const w = expanded ? TERMINAL.panel.w : TERMINAL.mini.w;
        const h = expanded ? 420 : TERMINAL.mini.h;
        return clampPosition(prev, w, h);
      });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [expanded]);

  // Animation hooks — stop when expanded (TerminalPanel doesn't need them)
  const animActive = !expanded;
  const breathing = useBreathing(animActive);
  const eyeDimmed = useBlink(animActive);
  const pupil = useEyeTracking(ref, animActive);

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

  // Close panel via Escape key only
  useEffect(() => {
    if (!expanded) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setExpanded(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  // ── Drag handlers ──

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Only drag from the top bar area (first 44px) or the mini bar
    const target = e.target as HTMLElement;
    // Don't drag from interactive elements inside expanded panel
    if (expanded && target.closest("input, button, textarea, select, a")) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    dragState.current = {
      startX: clientX,
      startY: clientY,
      startPosX: rect.left,
      startPosY: rect.top,
      dragging: false,
    };
    hasDragged.current = false;

    function onMove(ev: MouseEvent | TouchEvent) {
      if (!dragState.current) return;
      const cx = "touches" in ev ? ev.touches[0].clientX : ev.clientX;
      const cy = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
      const dx = cx - dragState.current.startX;
      const dy = cy - dragState.current.startY;

      // Start dragging after 3px threshold
      if (!dragState.current.dragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        dragState.current.dragging = true;
        hasDragged.current = true;
      }
      if (!dragState.current.dragging) return;

      const w = expanded ? TERMINAL.panel.w : TERMINAL.mini.w;
      const h = expanded ? 420 : TERMINAL.mini.h;
      const newPos = clampPosition(
        { x: dragState.current.startPosX + dx, y: dragState.current.startPosY + dy },
        w, h,
      );
      setPosition(newPos);

      ev.preventDefault();
    }

    function onEnd() {
      if (dragState.current?.dragging && positionRef.current) {
        savePosition(positionRef.current);
      }
      dragState.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    }

    document.addEventListener("mousemove", onMove, { passive: false });
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
  }, [expanded]);

  // Click mini bar to expand (only if not dragging)
  const handleClick = useCallback(() => {
    if (expanded || hasDragged.current) return;
    setExpanded(true);
  }, [expanded]);

  // Close button
  const handleClose = useCallback(() => {
    setExpanded(false);
  }, []);

  if (mobile) return <XiaoWaiMobile />;

  // Build style: use saved position if available, otherwise default dock
  const w = expanded ? TERMINAL.panel.w : TERMINAL.mini.w;
  const h = expanded ? 420 : TERMINAL.mini.h;
  const baseStyle = expanded ? panelStyle(false) : miniBarStyle(false);
  const dynamicStyle: React.CSSProperties = position
    ? { ...baseStyle, left: position.x, top: position.y, right: "auto", bottom: "auto" }
    : baseStyle;

  return (
    <div
      ref={ref}
      style={dynamicStyle}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      onClick={handleClick}
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
