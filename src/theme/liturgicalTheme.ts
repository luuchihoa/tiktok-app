import { LiturgicalSeason } from "../data/videoInput";

export interface ThemeConfig {
  primaryColor: string; // Accent color for headers, highlights
  secondaryColor: string; // Sub-accent for pills, borders
  bgGradient: string; // Background gradient
  glowColor: string; // Text & box glow
  particleColor: string; // Particles color
  seasonIcon: string; // Liturgical Icon for season badge
}

export const getLiturgicalTheme = (season?: LiturgicalSeason): ThemeConfig => {
  switch (season) {
    case "ORDINARY": // Mùa Thường Niên (Xanh lá ngọc - Icon Nhánh Lá Hy Vọng)
      return {
        primaryColor: "#10b981",
        secondaryColor: "#34d399",
        bgGradient: "radial-gradient(circle at 50% 30%, #063726 0%, #031c13 55%, #010a07 100%)",
        glowColor: "rgba(16, 185, 129, 0.45)",
        particleColor: "#6ee7b7",
        seasonIcon: "🌿",
      };
    case "LENT_ADVENT": // Mùa Chay / Mùa Vọng (Tím thạch anh - Icon Thánh Giá Tím)
      return {
        primaryColor: "#a855f7",
        secondaryColor: "#c084fc",
        bgGradient: "radial-gradient(circle at 50% 30%, #3b146b 0%, #1e0938 55%, #0b0217 100%)",
        glowColor: "rgba(168, 85, 247, 0.45)",
        particleColor: "#e9d5ff",
        seasonIcon: "✝️",
      };
    case "MARTYR": // Lễ Tử Đạo / Thánh Thần (Đỏ Hồng Ngọc - Icon Lửa Thánh Thần)
      return {
        primaryColor: "#ef4444",
        secondaryColor: "#f87171",
        bgGradient: "radial-gradient(circle at 50% 30%, #520e0e 0%, #290606 55%, #0f0101 100%)",
        glowColor: "rgba(239, 68, 68, 0.45)",
        particleColor: "#fca5a5",
        seasonIcon: "🔥",
      };
    case "EASTER_CHRISTMAS": // Mùa Phục Sinh / Giáng Sinh / Lễ Trọng (Vàng Hoàng Gia - Icon Nến Phục Sinh)
    default:
      return {
        primaryColor: "#f59e0b",
        secondaryColor: "#fbbf24",
        bgGradient: "radial-gradient(circle at 50% 30%, #3d2407 0%, #1c1003 55%, #0a0501 100%)",
        glowColor: "rgba(245, 158, 11, 0.45)",
        particleColor: "#fde68a",
        seasonIcon: "🕯️",
      };
  }
};
