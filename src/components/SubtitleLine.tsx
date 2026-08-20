import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT_FAMILY } from "../load-font";

interface SubtitleLineProps {
  subtitle: {
    text: string;
    startMs: number;
    durationMs: number;
    tokens: {
      text: string;
      fromMs: number;
      toMs: number;
    }[];
  };
}

const HOLY_WORDS_LIST = [
  "Thiên-Chúa",
];

const HOLY_WORDS_PATTERN = HOLY_WORDS_LIST.map((w) =>
  w.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
).join("|");

const HOLY_WORDS_SPLIT_REGEX = new RegExp(`(${HOLY_WORDS_PATTERN})`, "gi");
const HOLY_WORDS_TEST_REGEX = new RegExp(`^(${HOLY_WORDS_PATTERN})$`, "i");

// Custom syntax pattern: *từ ngữ* hoặc [từ ngữ]
const CUSTOM_HIGHLIGHT_REGEX = /(\*[^*]+\*|\[[^\]]+\])/g;

const INTRO_OFFSET_MS = 3500;

export const SubtitleLine: React.FC<SubtitleLineProps> = ({ subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = Math.round(((subtitle.startMs + INTRO_OFFSET_MS) / 1000) * fps);
  const framesSinceStart = Math.max(0, frame - startFrame);

  // Hiệu ứng mờ -> rõ mượt mà, không rung lắc (Damped smooth entrance)
  const opacity = spring({
    fps,
    frame: framesSinceStart,
    config: { damping: 30, stiffness: 200, mass: 0.5 },
    durationInFrames: 6,
  });


  const renderAutoHolyWords = (text: string, keyPrefix: string) => {
    const parts = text.split(HOLY_WORDS_SPLIT_REGEX);
    return parts.map((part, i) => {
      if (HOLY_WORDS_TEST_REGEX.test(part.trim())) {
        return (
          <span
            key={`${keyPrefix}-${i}`}
            style={{
              color: "#fbbf24",
              textShadow:
                "0 0 18px rgba(251, 191, 36, 0.85), 0 4px 16px rgba(0,0,0,0.95)",
            }}
          >
            {part}
          </span>
        );
      }
      return <span key={`${keyPrefix}-${i}`}>{part}</span>;
    });
  };

  const renderHighlightedText = (text: string) => {
    if (!text) return null;
    // Bóc tách cú pháp thủ công *từ ngữ* hoặc [từ ngữ]
    const customParts = text.split(CUSTOM_HIGHLIGHT_REGEX);
    return customParts.map((part, i) => {
      if (!part) return null;
      const isAsteriskMatch = part.startsWith("*") && part.endsWith("*") && part.length > 2;
      const isBracketMatch = part.startsWith("[") && part.endsWith("]") && part.length > 2;

      if (isAsteriskMatch || isBracketMatch) {
        const cleanContent = part.slice(1, -1);
        return (
          <span
            key={`custom-${i}`}
            style={{
              color: "#fbbf24",
              textShadow:
                "0 0 18px rgba(251, 191, 36, 0.85), 0 4px 16px rgba(0,0,0,0.95)",
            }}
          >
            {cleanContent}
          </span>
        );
      }

      return renderAutoHolyWords(part, `auto-${i}`);
    });
  };

  return (
    <p
      style={{
        opacity,
        fontFamily: `"${FONT_FAMILY}", sans-serif`,
        fontWeight: 800,
        fontSize: 52,
        color: "#ffffff",
        textAlign: "center",
        lineHeight: 1.22,
        margin: 0,
        padding: "0 8px",
        letterSpacing: "-0.4px",
        whiteSpace: "pre-wrap",
        textShadow: "0 4px 16px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.8)",
        transform: "translate3d(0, 0, 0)",
        WebkitFontSmoothing: "antialiased",
        textRendering: "geometricPrecision",
        backfaceVisibility: "hidden",
      }}
    >
      {renderHighlightedText(subtitle.text)}
    </p>
  );
};
