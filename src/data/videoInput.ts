import { z } from "zod";

export type LiturgicalSeason = "ORDINARY" | "LENT_ADVENT" | "EASTER_CHRISTMAS" | "MARTYR";

export const VideoInputSchema = z.object({
  date: z.string().describe("Ngày tháng (VD: 29/07/2026)"),
  bannerTag: z.string().optional().default("PHỤNG VỤ LỜI CHÚA HÀNG NGÀY").describe("Văn bản thẻ Badge Header"),
  feastName: z.string().describe("Tên Thánh Lễ / Lễ Trọng"),
  readingType: z.string().describe("Loại bài đọc (VD: BÀI ĐỌC 1, TIN MỪNG)"),
  bibleRef: z.string().describe("Trích đoạn Kinh Thánh (VD: 1 Ga 4,7-16)"),
  quote: z.string().describe("Câu trích dẫn ngắn (Quote)"),
  audioFile: z.string().describe("File âm thanh bài đọc trong public/ (VD: audio.mp3)"),
  audioDurationSeconds: z.number().optional().describe("Thời lượng âm thanh tính bằng giây"),
  introAudioFile: z.string().optional().default("piano_intro.mp3").describe("File nhạc dạo vào (.mp3)"),
  outroAudioFile: z.string().optional().default("piano_outro.mp3").describe("File nhạc dạo ra (.mp3)"),
  imageFile: z.string().default("cross.jpg").describe("File ảnh trung tâm trong public/ (VD: cross.jpg)"),
  imagePositionY: z.number().optional().default(50).describe("Vị trí dọc của ảnh trung tâm (0% Top -> 100% Bottom)"),
  bgImageFile: z.string().optional().describe("File ảnh nền trong public/"),
  logoFile: z.string().optional().describe("File logo thương hiệu trong public/ (VD: favicon.svg)"),
  season: z.enum(["ORDINARY", "LENT_ADVENT", "EASTER_CHRISTMAS", "MARTYR"]).default("EASTER_CHRISTMAS").describe("Sắc phục Phụng Vụ / Tông màu"),
  websiteUrl: z.string().optional().default("loichuamoingay.org").describe("Địa chỉ Website / Kênh truyền thông (VD: loichuamoingay.org)"),
});

export type VideoInput = z.infer<typeof VideoInputSchema>;
