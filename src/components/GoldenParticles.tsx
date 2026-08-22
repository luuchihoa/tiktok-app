import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

interface GoldenParticlesProps {
  color?: string;
  count?: number;
}

export const GoldenParticles: React.FC<GoldenParticlesProps> = ({
  color = "#fde68a",
  count = 12,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Restrained, deterministic motes: they frame the sacred image instead of
  // competing with the reading text and subtitles.
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const isLeft = i % 2 === 0;
      const accent = i === 2 || i === 9;
      return {
        id: i,
        // Keep particles along the hero image's outer edges (not the subtitle area).
        x: (isLeft ? 120 : 860) + ((i * 43) % 115),
        y: 330 + ((i * 137) % 860),
        size: accent ? 8 : 3 + (i % 3),
        driftX: 8 + (i % 4) * 3,
        driftY: 70 + (i % 5) * 14,
        lifetime: Math.round(fps * (10 + (i % 4) * 2)),
        phase: i * Math.round(fps * 0.9),
        opacity: accent ? 0.58 : 0.2 + (i % 4) * 0.07,
        accent,
      };
    });
  }, [count, fps]);

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
        const cycleFrame = (frame + p.phase) % p.lifetime;
        const progress = cycleFrame / p.lifetime;
        const driftY = -progress * p.driftY;
        const swayX = Math.sin(progress * Math.PI * 2 + p.id) * p.driftX;
        // Fade in/out slowly once per journey — no distracting glitter flicker.
        const opacity = p.opacity * Math.sin(progress * Math.PI);

        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: p.accent ? "#fffdf0" : color,
              opacity,
              transform: `translate3d(${swayX}px, ${driftY}px, 0)`,
              // Only two accent motes use a glow; the rest stay cheap to composite.
              boxShadow: p.accent ? `0 0 ${p.size * 3}px ${color}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
};
