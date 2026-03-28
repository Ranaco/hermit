"use client";

import { useEffect, useMemo, useState } from "react";

type AmbientLayer = {
  className: string;
  depth: number;
  travel: number;
};

const layers: AmbientLayer[] = [
  {
    className:
      "left-[5%] top-[8rem] h-28 w-28 rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(170,112,54,0.16),rgba(255,255,255,0.02))]",
    depth: 0.22,
    travel: 18,
  },
  {
    className:
      "right-[8%] top-[11rem] h-18 w-40 rounded-full border border-white/8 bg-[linear-gradient(90deg,rgba(255,255,255,0.04),rgba(191,120,58,0.2),rgba(255,255,255,0.04))]",
    depth: 0.34,
    travel: 24,
  },
  {
    className:
      "left-[10%] top-[36rem] h-16 w-44 rounded-full border border-white/8 bg-[linear-gradient(90deg,rgba(255,255,255,0.02),rgba(220,145,72,0.14),rgba(255,255,255,0.02))]",
    depth: 0.18,
    travel: 16,
  },
  {
    className:
      "right-[12%] top-[42rem] h-24 w-24 rounded-[30px] border border-white/8 bg-[radial-gradient(circle_at_30%_30%,rgba(156,99,43,0.18),rgba(255,255,255,0.02))]",
    depth: 0.28,
    travel: 20,
  },
  {
    className:
      "left-[18%] bottom-[16%] h-20 w-20 rounded-full border border-white/8 bg-[radial-gradient(circle,rgba(168,112,64,0.18),rgba(255,255,255,0.03))]",
    depth: 0.14,
    travel: 12,
  },
  {
    className:
      "right-[18%] bottom-[12%] h-20 w-56 rounded-full border border-white/8 bg-[linear-gradient(90deg,rgba(255,255,255,0.02),rgba(214,150,77,0.16),rgba(255,255,255,0.02))]",
    depth: 0.26,
    travel: 22,
  },
];

export function DocsAmbientParallax() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const updatePreference = () => setReducedMotion(mediaQuery.matches);

    const onPointerMove = (event: PointerEvent) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      setPointer({ x, y });
    };

    const onScroll = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        frame = 0;
      });
    };

    updatePreference();
    onScroll();
    mediaQuery.addEventListener("change", updatePreference);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  const layerStyles = useMemo(
    () =>
      layers.map((layer) => {
        if (reducedMotion) {
          return { transform: "translate3d(0, 0, 0)" };
        }

        const translateX = pointer.x * layer.travel;
        const translateY = pointer.y * layer.travel + scrollY * layer.depth * 0.05;
        return {
          transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
        };
      }),
    [pointer.x, pointer.y, reducedMotion, scrollY],
  );

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {layers.map((layer, index) => (
        <div
          key={layer.className}
          className={`absolute hidden blur-[1px] will-change-transform transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] lg:block ${layer.className}`}
          style={layerStyles[index]}
        />
      ))}
    </div>
  );
}
