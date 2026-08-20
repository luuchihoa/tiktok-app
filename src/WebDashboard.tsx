/**
 * @deprecated — NOT the supported production studio.
 *
 * The canonical Catholic Video Studio UI is `public/studio.html`.
 * That page owns all features: upload, save/restore, subtitle editor,
 * subtitle generation (Whisper AI), and MP4 render via the Express API.
 *
 * This React component (`WebDashboard`) is retained for reference only.
 * It is not mounted in Root.tsx and is not part of the Remotion bundle.
 * Do not add new features here; update `public/studio.html` instead.
 */
import React, { useState } from "react";
import { Player } from "@remotion/player";
import { CatholicVideo } from "./CatholicVideo";
import { videoData as initialData } from "./data/today";
import { VideoInput, LiturgicalSeason } from "./data/videoInput";
import { FONT_FAMILY } from "./load-font";

export const WebDashboard: React.FC = () => {
  const [formData, setFormData] = useState<VideoInput>(initialData);

  const handleInputChange = (
    field: keyof VideoInput,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      handleInputChange("imageFile", blobUrl);
    }
  };

  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      handleInputChange("audioFile", blobUrl);
    }
  };

  const seasons: { key: LiturgicalSeason; label: string; color: string }[] = [
    { key: "EASTER_CHRISTMAS", label: "🟡 Mùa Phục Sinh / Lễ Trọng", color: "#f59e0b" },
    { key: "ORDINARY", label: "🟢 Mùa Thường Niên", color: "#10b981" },
    { key: "LENT_ADVENT", label: "🟣 Mùa Chay / Mùa Vọng", color: "#a855f7" },
    { key: "MARTYR", label: "🔴 Lễ Tử Đạo / Thánh Thần", color: "#ef4444" },
  ];

  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#0a0806",
        color: "#ffffff",
        fontFamily: `"${FONT_FAMILY}", sans-serif`,
        overflow: "hidden",
      }}
    >
      {/* 👈 LEFT PANEL: INPUT FORM DASHBOARD */}
      <div
        style={{
          width: "480px",
          minWidth: "420px",
          height: "100%",
          backgroundColor: "#14100c",
          borderRight: "1px solid rgba(245, 158, 11, 0.2)",
          padding: "32px",
          boxSizing: "border-box",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 800,
              color: "#f59e0b",
              margin: 0,
              letterSpacing: "1px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            ✝️ Bảng Điều Khiển Video
          </h1>
          <p style={{ fontSize: "13px", color: "#a1a1aa", margin: "6px 0 0 0" }}>
            Tùy chỉnh nội dung trực tiếp và xem trước video thời gian thực
          </p>
        </div>

        <hr style={{ borderColor: "rgba(255,255,255,0.08)", margin: "4px 0" }} />

        {/* Liturgical Season Selection */}
        <div>
          <label style={{ fontSize: "13px", fontWeight: 700, color: "#d4d4d8", display: "block", marginBottom: "8px" }}>
            🎨 SẮC PHỤC PHỤNG VỤ (MÙA LỄ)
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {seasons.map((s) => (
              <button
                key={s.key}
                onClick={() => handleInputChange("season", s.key)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: formData.season === s.key ? `2px solid ${s.color}` : "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: formData.season === s.key ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.2)",
                  color: "#ffffff",
                  textAlign: "left",
                  fontSize: "13px",
                  fontWeight: formData.season === s.key ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Fields */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#a1a1aa", display: "block", marginBottom: "6px" }}>
            📅 NGÀY THÁNG
          </label>
          <input
            type="text"
            value={formData.date}
            onChange={(e) => handleInputChange("date", e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "#1c1712",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#ffffff",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#a1a1aa", display: "block", marginBottom: "6px" }}>
            👑 TÊN THÁNH LỄ / LỄ TRỌNG
          </label>
          <input
            type="text"
            value={formData.feastName}
            onChange={(e) => handleInputChange("feastName", e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "#1c1712",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#ffffff",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#a1a1aa", display: "block", marginBottom: "6px" }}>
            📖 LOẠI BÀI ĐỌC
          </label>
          <input
            type="text"
            value={formData.readingType}
            onChange={(e) => handleInputChange("readingType", e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "#1c1712",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#ffffff",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#a1a1aa", display: "block", marginBottom: "6px" }}>
            📌 TRÍCH ĐOẠN KINH THÁNH (BIBLE REF)
          </label>
          <input
            type="text"
            value={formData.bibleRef}
            onChange={(e) => handleInputChange("bibleRef", e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "#1c1712",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#ffffff",
              fontSize: "14px",
              outline: "none",
            }}
          />
        </div>


        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#a1a1aa", display: "block", marginBottom: "6px" }}>
            💬 CÂU TRÍCH DẪN (QUOTE)
          </label>
          <textarea
            rows={3}
            value={formData.quote}
            onChange={(e) => handleInputChange("quote", e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "#1c1712",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#ffffff",
              fontSize: "14px",
              outline: "none",
              resize: "vertical",
            }}
          />
        </div>

        {/* IMAGE FILE PICKER */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#a1a1aa", display: "block", marginBottom: "6px" }}>
            🖼️ CHỌN ẢNH THÁNH GIÁ / HÌNH ẢNH (BẤT KỲ ĐÂU)
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px 16px",
              borderRadius: "10px",
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              border: "1px dashed #f59e0b",
              color: "#fbbf24",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📁 Click Để Chọn Ảnh Từ Máy Tính...
            <input
              type="file"
              accept="image/*"
              onChange={handleImageFileSelect}
              style={{ display: "none" }}
            />
          </label>
          {formData.imageFile && (
            <span style={{ fontSize: "11px", color: "#a1a1aa", marginTop: "4px", display: "block", wordBreak: "break-all" }}>
              Đã chọn: {formData.imageFile.substring(0, 40)}...
            </span>
          )}
        </div>

        {/* AUDIO FILE PICKER */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "#a1a1aa", display: "block", marginBottom: "6px" }}>
            🎙️ CHỌN FILE ÂM THANH BÀI ĐỌC (BẤT KỲ ĐÂU)
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px 16px",
              borderRadius: "10px",
              backgroundColor: "rgba(59, 130, 246, 0.12)",
              border: "1px dashed #3b82f6",
              color: "#60a5fa",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🎵 Click Để Chọn Audio (MP3/WAV)...
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioFileSelect}
              style={{ display: "none" }}
            />
          </label>
          {formData.audioFile && (
            <span style={{ fontSize: "11px", color: "#a1a1aa", marginTop: "4px", display: "block", wordBreak: "break-all" }}>
              Đã chọn: {formData.audioFile.substring(0, 40)}...
            </span>
          )}
        </div>
      </div>

      {/* 👉 RIGHT PANEL: LIVE PLAYER PREVIEW */}
      <div
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#a1a1aa", marginBottom: "16px", letterSpacing: "1px" }}>
          🎬 PREVIEW VIDEO THỜI GIAN THỰC (9:16 TIKTOK)
        </h2>

        <div
          style={{
            height: "82vh",
            aspectRatio: "9/16",
            borderRadius: "24px",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(245,158,11,0.2)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <Player
            component={CatholicVideo}
            inputProps={formData}
            durationInFrames={450}
            compositionWidth={1080}
            compositionHeight={1920}
            fps={30}
            style={{
              width: "100%",
              height: "100%",
            }}
            controls
            autoPlay={false}
            loop
          />
        </div>
      </div>
    </div>
  );
};
