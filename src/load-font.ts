import { loadFont } from "@remotion/google-fonts/BeVietnamPro";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["vietnamese", "latin"],
});

export const FONT_FAMILY = fontFamily;
