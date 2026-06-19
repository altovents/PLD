"use client";

import { useEffect, useRef } from "react";

export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const SIZE = 700;
    const HALF = SIZE / 2;

    // Start offscreen so it doesn't flash at 0,0
    let raf = 0;
    let tx = -HALF;
    let ty = -HALF;

    function onMove(e: MouseEvent) {
      tx = e.clientX - HALF;
      ty = e.clientY - HALF;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el!.style.transform = `translate(${tx}px, ${ty}px)`;
      });
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[1]"
      style={{
        width: 700,
        height: 700,
        transform: "translate(-350px, -350px)",
        willChange: "transform",
        background:
          "radial-gradient(circle at center, " +
          "rgba(120,80,255,0.13) 0%, " +
          "rgba(80,120,255,0.07) 30%, " +
          "rgba(59,130,246,0.04) 55%, " +
          "transparent 70%)",
        borderRadius: "50%",
        filter: "blur(8px)",
        transition: "transform 0.08s linear",
      }}
    />
  );
}
