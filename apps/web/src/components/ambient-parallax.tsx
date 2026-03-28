"use client";

import { useEffect, useMemo, useState } from "react";

type Layer = {
  className: string;
  depth: number;
  travel: number;
};

const defaultLayers: Layer[] = [
  {
    className:
      "left-[clamp(-4rem,2vw,-1rem)] top-[8rem] h-28 w-28 rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(241,221,198,0.18),rgba(255,255,255,0.03))] shadow-[0_24px_70px_-44px_rgba(0,0,0,0.75)]",
    depth: 0.35,
    travel: 18,
  },
  {
    className:
      "right-[6%] top-[18%] h-20 w-20 rounded-full border border-white/8 bg-[radial-gradient(circle,rgba(123,166,162,0.22),rgba(255,255,255,0.03))] shadow-[0_24px_60px_-42px_rgba(0,0,0,0.72)]",
    depth: 0.5,
    travel: 22,
  },
  {
    className:
      "bottom-[12%] right-[18%] h-14 w-36 rounded-full border border-white/8 bg-[linear-gradient(90deg,rgba(255,255,255,0.06),rgba(241,221,198,0.16),rgba(255,255,255,0.05))] shadow-[0_18px_48px_-36px_rgba(0,0,0,0.66)]",
    depth: 0.25,
    travel: 12,
  },
];

export function AmbientParallax({ layers = defaultLayers }: { layers?: Layer[] }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();

    const handlePointerMove = (event: PointerEvent) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      setPointer({ x, y });
    };

    const handleScroll = () => setScrollOffset(window.scrollY);

    mediaQuery.addEventListener("change", updatePreference);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const layerStyles = useMemo(
    () =>
      layers.map((layer) => {
        if (reducedMotion) {
          return { transform: "translate3d(0,0,0)" };
        }

        const translateX = pointer.x * layer.travel;
        const translateY = pointer.y * layer.travel + scrollOffset * layer.depth * 0.05;
        return {
          transform: `translate3d(${translateX}px, ${translateY}px, 0)`,
        };
      }),
    [layers, pointer.x, pointer.y, reducedMotion, scrollOffset],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {layers.map((layer, index) => (
        <div
          key={layer.className}
          className={`absolute will-change-transform transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${layer.className}`}
          style={layerStyles[index]}
        />
      ))}
    </div>
  );
}
