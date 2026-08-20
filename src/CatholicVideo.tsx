import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  delayRender,
  continueRender,
  Sequence,
} from "remotion";
import { Audio } from "@remotion/media";
import { VideoInput } from "./data/videoInput";
import { SubtitleLine } from "./components/SubtitleLine";
import { FONT_FAMILY } from "./load-font";
import { getLiturgicalTheme } from "./theme/liturgicalTheme";
import { GoldenParticles } from "./components/GoldenParticles";
import { ProgressBar } from "./components/ProgressBar";

type SubtitleEntry = {
  startMs: number;
  durationMs: number;
  text: string;
  tokens: {
    text: string;
    fromMs: number;
    toMs: number;
  }[];
};

export const CatholicVideo: React.FC<VideoInput> = (props) => {
  const data: VideoInput = props;

  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const theme = getLiturgicalTheme(data?.season);

  const [subtitles, setSubtitles] = useState<SubtitleEntry[] | null>(null);
  const [handle] = useState(() => delayRender());

  useEffect(() => {
    const fetchSubtitles = async () => {
      try {
        let rawAudio = data.audioFile || "audio.mp3";
        if (
          rawAudio.startsWith("http://") ||
          rawAudio.startsWith("https://") ||
          rawAudio.startsWith("blob:")
        ) {
          rawAudio = rawAudio.split("/").pop() || "audio.mp3";
        }
        const cleanAudio = rawAudio.split("?")[0].split("#")[0];
        const jsonName = cleanAudio.replace(
          /\.(mp4|mkv|mov|webm|mp3|wav)$/i,
          ".json",
        );

        let subsData = null;
        try {
          const staticCurrent = staticFile(`subs/current_subtitles.json`);
          const resCurrent = await fetch(staticCurrent);
          if (resCurrent.ok) {
            subsData = await resCurrent.json();
          }
        } catch (_) {}

        if (!subsData) {
          try {
            const staticUrl = staticFile(`subs/${jsonName}`);
            const res = await fetch(staticUrl);
            if (res.ok) {
              subsData = await res.json();
            }
          } catch (e) {
            console.warn(
              "Static subtitle fetch failed, trying API fallback",
              e,
            );
          }
        }

        if (!subsData) {
          try {
            const apiUrl = `http://localhost:3001/api/subtitles?audioFile=${encodeURIComponent(cleanAudio)}`;
            const apiRes = await fetch(apiUrl);
            if (apiRes.ok) {
              const apiJson = await apiRes.json();
              if (apiJson.success && apiJson.subtitles) {
                subsData = apiJson.subtitles;
              }
            }
          } catch (apiErr) {
            console.warn("API subtitle fallback failed", apiErr);
          }
        }

        if (subsData && Array.isArray(subsData)) {
          setSubtitles(subsData);
        } else {
          setSubtitles(null);
        }
      } catch (err) {
        console.log("No subtitle file found or error fetching", err);
        setSubtitles(null);
      }
      continueRender(handle);
    };

    if (data?.audioFile) {
      fetchSubtitles();
    } else {
      continueRender(handle);
    }
  }, [data?.audioFile, handle]);

  // INTRO AUDIO DELAY: 3.5s for Piano Intro Solo
  const INTRO_OFFSET_MS = 3500;
  const INTRO_OFFSET_FRAMES = Math.round((INTRO_OFFSET_MS / 1000) * fps);

  // OUTRO AUDIO DURATION: 4.5s for Piano Outro Solo
  const OUTRO_OFFSET_MS = 4500;
  const OUTRO_OFFSET_FRAMES = Math.round((OUTRO_OFFSET_MS / 1000) * fps);

  const currentTimeMs = Math.max(
    0,
    ((frame - INTRO_OFFSET_FRAMES) / fps) * 1000,
  );
  const currentSubtitleIndex =
    subtitles && frame >= INTRO_OFFSET_FRAMES
      ? subtitles.findIndex(
          (sub) =>
            currentTimeMs >= sub.startMs &&
            currentTimeMs <= sub.startMs + sub.durationMs,
        )
      : -1;
  const currentSub =
    subtitles && currentSubtitleIndex >= 0
      ? subtitles[currentSubtitleIndex]
      : null;

  const sp = (delay: number, mass = 0.5) =>
    spring({
      fps,
      frame: frame - delay,
      config: { damping: 12, mass, stiffness: 200 },
    });

  // Hero Image Breath Motion
  const breathScale = interpolate(
    Math.sin((frame / fps) * 0.8),
    [-1, 1],
    [1.0, 1.04],
  );

  // Ambient Light Rays Sweep
  const rayAngle = interpolate((frame / fps) % 10, [0, 10], [-20, 20]);
  const rayOpacity = interpolate(
    Math.sin((frame / fps) * 1.5),
    [-1, 1],
    [0.12, 0.28],
  );

  const getCleanBasename = (filePath?: string, fallback = "") => {
    if (!filePath) return fallback;
    const clean =
      filePath.startsWith("http") || filePath.startsWith("blob:")
        ? filePath.split("/").pop() || fallback
        : filePath;
    return clean.split("?")[0].split("#")[0];
  };

  // Center Hero Image (User Selected Image for Reading / Feast Day)
  const cleanImageFile = getCleanBasename(data.imageFile, "cross.jpg");
  const heroImageSrc = data?.imageFile?.startsWith("blob:")
    ? data.imageFile
    : staticFile(cleanImageFile);

  const cleanAudioFile = getCleanBasename(data.audioFile, "audio.mp3");
  const cleanIntroFile = getCleanBasename(
    data.introAudioFile,
    "piano_intro.mp3",
  );
  const cleanOutroFile = getCleanBasename(
    data.outroAudioFile,
    "piano_outro.mp3",
  );
  const cleanLogoFile = getCleanBasename(data.logoFile, "logo.png");

  const audioSrc = data.audioFile?.startsWith("blob:")
    ? data.audioFile
    : staticFile(cleanAudioFile);

  const introSrc = data.introAudioFile?.startsWith("blob:")
    ? data.introAudioFile
    : staticFile(cleanIntroFile);

  const outroSrc = data.outroAudioFile?.startsWith("blob:")
    ? data.outroAudioFile
    : staticFile(cleanOutroFile);

  const logoSrc = data.logoFile?.startsWith("blob:")
    ? data.logoFile
    : staticFile(cleanLogoFile);

  const websiteUrl = data.websiteUrl || "loichuamoingay.org";

  return (
    <AbsoluteFill
      style={{
        background: theme.bgGradient,
        fontFamily: FONT_FAMILY,
        color: "#ffffff",
        width: 1080,
        height: 1920,
        overflow: "hidden",
      }}
    >
      {/* 🏷️ BRAND LOGO MEDALLION WATERMARK (TIKTOK SAFE ZONE: X: 60px, Y: 125px) */}
      <div
        style={{
          position: "absolute",
          top: 125,
          left: 60,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: sp(0),
          transform: `translateY(${Math.round(
            spring({
              fps,
              frame,
              config: { damping: 14, stiffness: 150 },
              from: -25,
              to: 0,
            }),
          )}px)`,
        }}
      >
        {/* Double Metallic Gold Circular Frame */}
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: "50%",
            padding: "2.5px",
            background: `linear-gradient(135deg, ${theme.secondaryColor}, #ffffff, ${theme.primaryColor})`,
            boxShadow: `0 0 24px ${theme.glowColor}, 0 6px 18px rgba(0,0,0,0.85)`,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              overflow: "hidden",
              background: "#0a0806",
              border: `1px solid ${theme.secondaryColor}`,
              boxSizing: "border-box",
            }}
          >
            <Img
              src={logoSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${breathScale})`,
              }}
            />
          </div>
        </div>
      </div>
      {websiteUrl && (
        <div
          style={{
            position: "absolute",
            top: 140,
            right: 90,
            zIndex: 10,
            opacity: sp(5),
            maxWidth: 420, // giới hạn chiều rộng
            transform: `translateY(${Math.round(
              spring({
                fps,
                frame,
                config: { damping: 14, stiffness: 150 },
                from: -25,
                to: 0,
              }),
            )}px)`,
          }}
        >
          <div
            style={{
              background: "rgba(22, 17, 13, 0.95)",
              border: `1.5px solid ${theme.secondaryColor}`,
              borderRadius: 22,
              padding: "10px 22px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: `0 0 18px ${theme.glowColor}, 0 4px 14px rgba(0,0,0,0.65)`,
            }}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>🌐</span>
            <span
              style={{
                fontFamily: "Outfit, 'Be Vietnam Pro', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: theme.secondaryColor,
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {websiteUrl}
            </span>
          </div>
        </div>
      )}
      {/* GOLDEN PARTICLES LAYER */}
      <GoldenParticles color={theme.particleColor} count={25} />
      {/* SWEEPING GOD RAYS LIGHT BEAM (FEATHERED CONIC GRADIENT - 0 FILTER COST) */}
      <div
        style={{
          position: "absolute",
          top: -200,
          left: -200,
          width: 1480,
          height: 1480,
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 40deg, ${theme.glowColor}18 55deg, ${theme.glowColor}40 70deg, ${theme.glowColor}18 85deg, transparent 100deg)`,
          transform: `rotate(${rayAngle}deg) translateZ(0)`,
          opacity: rayOpacity,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* OPTION 3: SACRED LITURGICAL RADIAL VIGNETTE LAYER */}
      <AbsoluteFill style={{ zIndex: 0 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 50% 35%, ${theme.glowColor} 0%, transparent 60%)`,
            opacity: 0.7,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at center, transparent 30%, rgba(5, 4, 3, 0.95) 85%)",
          }}
        />
      </AbsoluteFill>
      {/* ── ZONE 1: HEADER (Y: 270px -> 470px) ──────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 270,
          left: 0,
          width: 1080,
          height: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
          padding: "0 60px",
          boxSizing: "border-box",
          opacity: sp(0),
          transform: `translateY(${Math.round(
            spring({
              fps,
              frame,
              config: { damping: 14, stiffness: 150 },
              from: -25,
              to: 0,
            }),
          )}px)`,
        }}
      >
        {/* Date badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#e4e4e7",
              letterSpacing: "4px",
              textTransform: "uppercase",
            }}
          >
            {data.date}
          </span>
        </div>

        {/* Proposal B: Tapered Glowing Spear Lines (3.5px -> 0px) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            margin: "12px 0",
          }}
        >
          {/* Left Tapered Spear Line */}
          <div
            style={{
              width: 170,
              height: 4,
              clipPath: "polygon(0% 50%, 100% 0%, 100% 100%)",
              background: `linear-gradient(to right, transparent 0%, ${theme.secondaryColor} 65%, #ffffff 100%)`,
              filter: `drop-shadow(0 0 8px ${theme.glowColor}) drop-shadow(0 0 16px ${theme.secondaryColor})`,
            }}
          />
          {/* Glowing Diamond Center Symbol (◆) */}
          <span
            style={{
              fontSize: 16,
              color: "#ffffff",
              display: "inline-block",
              transform: "scale(1.2)",
              textShadow: `0 0 10px #ffffff, 0 0 20px ${theme.secondaryColor}, 0 0 35px ${theme.glowColor}`,
            }}
          >
            ◆
          </span>
          {/* Right Tapered Spear Line */}
          <div
            style={{
              width: 170,
              height: 4,
              clipPath: "polygon(0% 0%, 100% 50%, 0% 100%)",
              background: `linear-gradient(to left, transparent 0%, ${theme.secondaryColor} 65%, #ffffff 100%)`,
              filter: `drop-shadow(0 0 8px ${theme.glowColor}) drop-shadow(0 0 16px ${theme.secondaryColor})`,
            }}
          />
        </div>

        {/* Feast Name (Responsive Font & Manual Multi-line Support) */}
        <h2
          style={{
            fontSize: data.feastName && data.feastName.length > 35 ? 36 : 42,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            margin: 0,
            lineHeight: 1.3,
            letterSpacing: "-0.5px",
            whiteSpace: "pre-line",
            textShadow: `0 2px 14px ${theme.glowColor}, 0 4px 20px rgba(0,0,0,0.9)`,
          }}
        >
          {data.feastName}
        </h2>

        {/* OPTION B: GLASSMORPHIC FLOATING BADGE WITH DOUBLE METALLIC BORDER */}
        <div
          style={{
            marginTop: 14,
            padding: "2.5px",
            borderRadius: 100,
            background: `linear-gradient(135deg, ${theme.secondaryColor}, rgba(255,255,255,0.4), ${theme.primaryColor})`,
            boxShadow: `0 0 24px ${theme.glowColor}, 0 6px 16px rgba(0,0,0,0.6)`,
          }}
        >
          <div
            style={{
              padding: "6px 26px",
              borderRadius: 100,
              background: "rgba(10, 8, 6, 0.88)",
              backdropFilter: "blur(16px)",
              border: `1px solid ${theme.secondaryColor}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 20,
                filter: `drop-shadow(0 0 6px ${theme.primaryColor})`,
              }}
            >
              {theme.seasonIcon}
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: theme.secondaryColor,
                letterSpacing: "2.5px",
                textTransform: "uppercase",
                textShadow: `0 0 10px ${theme.glowColor}`,
              }}
            >
              {data.bannerTag || "PHỤNG VỤ LỜI CHÚA HÀNG NGÀY"}
            </span>
            <span
              style={{
                fontSize: 20,
                filter: `drop-shadow(0 0 6px ${theme.primaryColor})`,
              }}
            >
              {theme.seasonIcon}
            </span>
          </div>
        </div>
      </div>
      {/* ── ZONE 2: HERO IMAGE - FULL BLEED (Y: 510px -> 1050px) ────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 510,
          left: 0,
          width: 1080,
          height: 540,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
          opacity: sp(3),
        }}
      >
        {/* Full Bleed Image Card */}
        <div
          style={{
            width: 1080,
            height: 540,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Img
            src={heroImageSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `center ${data.imagePositionY ?? 50}%`,
              transform: `scale(${breathScale})`,
            }}
            durationInFrames={6085}
          />
          {/* Top Blend Gradient — 130px, 4-stop feather, solid black at edge */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 1080,
              height: 130,
              background:
                "linear-gradient(to bottom, rgba(10,8,6,1.0) 0%, rgba(10,8,6,0.75) 35%, rgba(10,8,6,0.25) 70%, transparent 100%)",
            }}
          />
          {/* Bottom Blend Gradient — 130px, 4-stop feather, solid black at edge */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 1080,
              height: 130,
              background:
                "linear-gradient(to top, rgba(10,8,6,1.0) 0%, rgba(10,8,6,0.75) 35%, rgba(10,8,6,0.25) 70%, transparent 100%)",
            }}
          />
          {/* Left Blend Gradient — 80px feather */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 80,
              height: 540,
              background:
                "linear-gradient(to right, rgba(10,8,6,1.0) 0%, rgba(10,8,6,0.5) 50%, transparent 100%)",
            }}
          />
          {/* Right Blend Gradient — 80px feather */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 80,
              height: 540,
              background:
                "linear-gradient(to left, rgba(10,8,6,1.0) 0%, rgba(10,8,6,0.5) 50%, transparent 100%)",
            }}
          />
        </div>
      </div>
      {/* ── ZONE 3: META CONTENT (Y: 1065px -> 1305px) ───────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 1065,
          left: 0,
          width: 1080,
          height: 240,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
          padding: "0 60px",
          boxSizing: "border-box",
          opacity: sp(6),
          transform: `translateY(${Math.round(
            spring({
              fps,
              frame: frame - 6,
              from: 25,
              to: 0,
            }),
          )}px)`,
        }}
      >
        <h1
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: theme.primaryColor,
            textTransform: "uppercase",
            letterSpacing: "4px",
            margin: 0,
            textShadow: `0 4px 20px ${theme.glowColor}, 0 2px 4px rgba(0,0,0,0.9)`,
          }}
        >
          {data.readingType}
        </h1>

        <span
          style={{
            fontSize: 30,
            fontWeight: 600,
            color: "#e4e4e7",
            marginTop: 8,
            letterSpacing: "1.5px",
          }}
        >
          {data.bibleRef}
        </span>

        {/* Small Quote Snippet with Translucent Quotation Marks */}
        {data.quote && (
          <p
            style={{
              fontSize: 26,
              fontStyle: "italic",
              color: "#a1a1aa",
              // Deliberately separate the quotation from the Bible reference so
              // they read as two distinct blocks, not one dense line.
              margin: "24px 0 0 0",
              textAlign: "center",
              lineHeight: 1.35,
              whiteSpace: "pre-line",
            }}
          >
            <span style={{ color: theme.secondaryColor, opacity: 0.6 }}>
              “{" "}
            </span>
            {data.quote.replace(/^”|“|"/g, "")}
            <span style={{ color: theme.secondaryColor, opacity: 0.6 }}>
              {" "}
              ”
            </span>
          </p>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          top: 1320,
          left: 54,
          width: 972,
          height: 280,
          zIndex: 3,
          opacity: sp(9),
          transform: `translateY(${Math.round(
            spring({
              fps,
              frame: frame - 9,
              from: 40,
              to: 0,
            }),
          )}px)`,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(180deg, rgba(22, 16, 12, 0.96) 0%, rgba(12, 9, 7, 0.98) 100%)",
            borderRadius: 32,
            border: `1.5px solid ${theme.secondaryColor}`,
            boxShadow: `0 20px 50px rgba(0,0,0,0.85), 0 0 30px ${theme.glowColor}40, inset 0 1px 0 rgba(255,255,255,0.15)`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px 32px",
            boxSizing: "border-box",
            position: "relative",
            overflow: "hidden",
            transform: "translate3d(0, 0, 0)",
            WebkitFontSmoothing: "antialiased",
            backfaceVisibility: "hidden",
          }}
        >
          {/* Top Edge Highlight Line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "15%",
              width: "70%",
              height: 2,
              background: `linear-gradient(to right, transparent, ${theme.secondaryColor}, transparent)`,
            }}
          />

          {frame < INTRO_OFFSET_FRAMES ? (
            /* 1. INTRO CALL-TO-ACTION (0s -> 3.5s) */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "Outfit, 'Be Vietnam Pro', sans-serif",
                  fontSize: 42,
                  fontWeight: 800,
                  color: theme.secondaryColor,
                  letterSpacing: "1px",
                  textShadow: `0 0 20px ${theme.glowColor}, 0 2px 10px rgba(0,0,0,0.9)`,
                }}
              >
                ✨ LỜI CHÚA MỖI NGÀY ✨
              </div>
              <div
                style={{
                  fontFamily: "Outfit, 'Be Vietnam Pro', sans-serif",
                  fontSize: 28,
                  fontWeight: 600,
                  color: "#ffffff",
                  letterSpacing: "0.5px",
                  padding: "8px 20px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.15)",
                  border: `1px solid ${theme.glowColor}`,
                  boxShadow: `0 0 20px ${theme.glowColor}66`,
                }}
              >
                🔗 {websiteUrl}
              </div>
            </div>
          ) : frame >= durationInFrames - OUTRO_OFFSET_FRAMES ? (
            /* 2. OUTRO CALL-TO-ACTION (Last 4.5s) */
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "Outfit, 'Be Vietnam Pro', sans-serif",
                  fontSize: 42,
                  fontWeight: 800,
                  color: theme.secondaryColor,
                  letterSpacing: "1px",
                  textShadow: `0 0 20px ${theme.glowColor}, 0 2px 10px rgba(0,0,0,0.9)`,
                }}
              >
                🙏 Nguyện Xin Chúa Chúc Lành
              </div>
              <div
                style={{
                  fontFamily: "Outfit, 'Be Vietnam Pro', sans-serif",
                  fontSize: 32, // tăng nhẹ so với 24 ở intro
                  fontWeight: 700, // đậm hơn chút
                  color: "#ffffff",
                  letterSpacing: "0.5px",
                  padding: "10px 24px", // pill to hơn chút
                  borderRadius: 999,
                  background: "rgba(28, 22, 17, 0.95)",
                  border: `1.5px solid ${theme.secondaryColor}`,
                  boxShadow: `0 0 24px ${theme.glowColor}`,
                }}
              >
                🔗 {websiteUrl}
              </div>
              <div
                style={{
                  fontFamily: "Outfit, 'Be Vietnam Pro', sans-serif",
                  fontSize: 22,
                  fontWeight: 500,
                  color: "#ffffffcc",
                  marginTop: 6,
                  letterSpacing: "0.3px",
                }}
              >
                Theo dõi để không bỏ lỡ Lời Chúa mỗi ngày
              </div>
            </div>
          ) : currentSub ? (
            /* 3. MAIN READING SUBTITLES (Unchanged) */
            <SubtitleLine key={currentSubtitleIndex} subtitle={currentSub} />
          ) : (
            <div style={{ height: 60 }} />
          )}
        </div>
      </div>
      {/* ── ZONE 5: FOOTER SAFE AREA & PROGRESS BAR (Y: 1600px -> 1920px) ─────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 1600,
          left: 0,
          width: 1080,
          height: 320,
          zIndex: 2,
        }}
      />
      {/* BOTTOM PROGRESS BAR */}
      <ProgressBar color={theme.primaryColor} />
      {/* 🎹 1. PIANO INTRO SOLO (0.0s -> 3.5s) */}
      <Sequence durationInFrames={INTRO_OFFSET_FRAMES + Math.round(0.5 * fps)}>
        <Audio
          src={introSrc}
          volume={(f) =>
            interpolate(
              f,
              [
                0,
                Math.round(0.5 * fps),
                INTRO_OFFSET_FRAMES - Math.round(0.5 * fps),
                INTRO_OFFSET_FRAMES,
              ],
              [0, 1.0, 1.0, 0.2],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            )
          }
        />
      </Sequence>
      {/* 🎙️ 2. MAIN VOICE AUDIO (Starts at 3.5s) */}
      <Sequence from={INTRO_OFFSET_FRAMES}>
        <Audio
          src={audioSrc}
          volume={(f) => {
            const mainAudioEndFrame =
              durationInFrames - INTRO_OFFSET_FRAMES - OUTRO_OFFSET_FRAMES;
            const fadeOut = interpolate(
              f,
              [mainAudioEndFrame - Math.round(0.5 * fps), mainAudioEndFrame],
              [1, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            );
            return fadeOut;
          }}
          from={1}
        />
      </Sequence>
      {/* 🎶 3. BACKGROUND PIANO AMBIENT (Starts at 3.5s at 18% volume under voiceover) */}
      {/* 🎹 4. PIANO OUTRO SOLO (Starts after main voice audio ends, 4.5s before video ends) */}
      <Sequence
        from={Math.max(0, durationInFrames - OUTRO_OFFSET_FRAMES)}
        durationInFrames={OUTRO_OFFSET_FRAMES}
      >
        <Audio
          src={outroSrc}
          volume={(f) =>
            interpolate(
              f,
              [
                0,
                Math.round(0.5 * fps),
                OUTRO_OFFSET_FRAMES - Math.round(1.5 * fps),
                OUTRO_OFFSET_FRAMES,
              ],
              [0, 1.0, 1.0, 0],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              },
            )
          }
        />
      </Sequence>
    </AbsoluteFill>
  );
};
