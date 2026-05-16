"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const CONFETTI_COLORS = ["#38bdf8", "#0ea5e9", "#fbbf24", "#f472b6", "#5DAD93", "#4A90A4"];
const PARTICLE_COUNT = 40;
const RESET_MS = 3000;
const TARGET_CLICKS = 5;

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  angle: number;
  distance: number;
  size: number;
  rotation: number;
}

interface Props {
  children: React.ReactNode;
  onActivate?: () => void;
}

export function ConfettiBurst({ children, onActivate }: Props) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const clicksRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const resetClicks = useCallback(() => {
    clicksRef.current = 0;
  }, []);

  const burst = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const newParticles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: Date.now() + i,
      x: cx,
      y: cy,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      angle: (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.3,
      distance: 40 + Math.random() * 80,
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
    }));

    setParticles(newParticles);
    onActivate?.();

    // Clean up after 2s
    setTimeout(() => setParticles([]), 2000);
  }, [onActivate]);

  const handleClick = useCallback(() => {
    clicksRef.current++;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(resetClicks, RESET_MS);

    if (clicksRef.current >= TARGET_CLICKS) {
      resetClicks();
      burst();
    }
  }, [burst, resetClicks]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div ref={containerRef} onClick={handleClick} style={{ position: "relative", cursor: "pointer" }}>
      {children}

      {/* Confetti particles rendered as absolute positioned divs */}
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "fixed",
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            borderRadius: 2,
            pointerEvents: "none",
            zIndex: 2000,
            animation: `cf-burst-${p.id} 1.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
          }}
        />
      ))}

      <style>{particles.map((p) => {
        const dx = Math.cos(p.angle) * p.distance;
        const dy = Math.sin(p.angle) * p.distance;
        return `
          @keyframes cf-burst-${p.id} {
            0%   { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
            100% { transform: translate(${dx}px, ${dy}px) rotate(${p.rotation}deg) scale(0.3); opacity: 0; }
          }
        `;
      }).join("\n")}</style>
    </div>
  );
}
