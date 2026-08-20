import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

interface GoldenParticlesProps {
  color?: string;
  count?: number;
}

export const GoldenParticles: React.FC<GoldenParticlesProps> = ({
  color = "#fde68a",
  count = 25,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Generate deterministic particle positions based on index
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const seedX = (i * 137.5) % 1080;
      const seedY = (i * 73.3) % 1920;
      const size = 3 + (i % 5) * 2; // 3px to 11px
      const speed = 0.8 + (i % 3) * 0.4;
      const opacityBase = 0.3 + (i % 4) * 0.15;
      return { id: i, x: seedX, y: seedY, size, speed, opacityBase };
    });
  }, [count]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        overflow: "hidden",
      }}
    >
      {particles.map((p) => {
        // Float upwards over time
        const translateY = interpolate(
          frame,
          [0, durationInFrames],
          [0, -p.speed * 300],
          { extrapolateRight: "wrap" }
        );

        // Sinusoidal sway horizontally
        const swayX = Math.sin((frame + p.id * 10) / 20) * 15;

        // Twinkle opacity
        const opacity =
          p.opacityBase + Math.sin((frame + p.id * 5) / 10) * 0.2;

        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: p.x + swayX,
              top: (p.y + translateY + 1920) % 1920,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: color,
              opacity: Math.max(0.1, Math.min(0.8, opacity)),
              boxShadow: `0 0 ${p.size * 2}px ${color}`,
              filter: "blur(1px)",
            }}
          />
        );
      })}
    </div>
  );
};
