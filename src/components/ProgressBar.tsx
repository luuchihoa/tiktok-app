import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

interface ProgressBarProps {
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  color = "#f59e0b",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = durationInFrames > 0 ? (frame / durationInFrames) * 100 : 0;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        height: 5,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          backgroundColor: color,
          boxShadow: `0 0 10px ${color}`,
          borderRadius: "0 2px 2px 0",
        }}
      />
    </div>
  );
};
