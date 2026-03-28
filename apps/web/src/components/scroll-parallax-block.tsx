"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function ScrollParallaxBlock({
  children,
  speed = 24,
  className,
  active = false,
  followCursor = false,
  cursorTravel = 14,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
  horizontal?: number;
  rotate?: number;
  scale?: number;
  active?: boolean;
  followCursor?: boolean;
  cursorTravel?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!active && !followCursor) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();

    let frame = 0;

    const handlePointerMove = (event: PointerEvent) => {
      if (!followCursor) {
        return;
      }

      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      setPointer({ x, y });
    };

    const update = () => {
      frame = 0;
      if (!ref.current || mediaQuery.matches || !active) {
        setOffset(0);
        return;
      }

      const rect = ref.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const progress = clamp((viewportHeight - rect.top) / (viewportHeight + rect.height), 0, 1);
      const centered = (progress - 0.5) * 2;
      setOffset(Number((centered * speed).toFixed(2)));
    };

    const handleScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    };

    mediaQuery.addEventListener("change", updatePreference);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    update();

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [active, followCursor, speed]);

  const transform = useMemo(() => {
    if (reducedMotion) {
      return "translate3d(0,0,0)";
    }

    const translateX = followCursor ? pointer.x * cursorTravel : 0;
    const translateY = (active ? offset : 0) + (followCursor ? pointer.y * cursorTravel : 0);
    return `translate3d(${translateX}px, ${translateY}px, 0)`;
  }, [active, cursorTravel, followCursor, offset, pointer.x, pointer.y, reducedMotion]);

  return (
    <div ref={ref} className={className}>
      <div
        style={{
          transform,
          transition:
            !active && !followCursor || reducedMotion ? "none" : "transform 280ms cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: active || followCursor ? "transform" : "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}
