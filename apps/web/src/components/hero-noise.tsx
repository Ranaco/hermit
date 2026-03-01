export function HeroNoise() {
  return (
    <div className="pointer-events-none absolute inset-0 h-full w-full mix-blend-overlay opacity-30">
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
      </svg>
      {/* Radial gradient overlay to fade edges */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(10,16,28,1)_100%)]" />
    </div>
  );
}
