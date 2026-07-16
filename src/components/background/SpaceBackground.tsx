"use client";

import { useEffect, useRef } from "react";
import { SpaceEngine } from "./engine";

/**
 * Full-viewport animated sky. Purely decorative: hidden from the
 * accessibility tree and never intercepts pointer events.
 */
export function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new SpaceEngine(canvas);
    engine.start();
    return () => engine.stop();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    />
  );
}
