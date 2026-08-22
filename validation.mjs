import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname);

export const MEDIA_EXTENSIONS = new Set([".mp3", ".wav", ".mp4", ".mkv", ".mov", ".webm"]);
export const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".svg"]);
export const ALL_UPLOAD_EXTENSIONS = new Set([...MEDIA_EXTENSIONS, ...IMAGE_EXTENSIONS]);

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "audio/mpeg",
  "audio/mp3",
  "audio/mpeg3",
  "audio/x-mpeg-3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/x-aac",
  "video/mp4",
  "video/x-matroska",
  "video/quicktime",
  "video/webm",
  "audio/webm",
  "application/octet-stream",
]);

/**
 * Validate a bare filename (no directory components).
 * Returns the resolved absolute path on success, or throws on failure.
 *
 * @param {string} name - Raw filename from user input
 * @param {"media"|"sub"|"image"} kind - Allowed file type category
 * @param {"public"|"subs"} dir - Target directory relative to root
 * @param {string|null} baseDirOverride - Optional root directory override (used in tests)
 */
export function validateFilename(name, kind = "media", dir = "public", baseDirOverride = null) {
  if (typeof name !== "string" || name.length === 0) {
    throw Object.assign(new Error("Filename is required"), { status: 400 });
  }
  if (
    name.includes("\0") ||
    name.includes("/") ||
    name.includes("\\") ||
    name.includes("..") ||
    name !== path.basename(name)
  ) {
    throw Object.assign(new Error("Invalid filename"), { status: 400 });
  }
  const ext = path.extname(name).toLowerCase();

  if (kind === "media" && !MEDIA_EXTENSIONS.has(ext)) {
    throw Object.assign(
      new Error(`Extension '${ext}' is not allowed for media files`),
      { status: 400 }
    );
  }
  if (kind === "sub" && ext !== ".json" && ext !== ".srt") {
    throw Object.assign(new Error("Subtitle file must be a .json or .srt file"), { status: 400 });
  }
  if (kind === "image" && !IMAGE_EXTENSIONS.has(ext)) {
    throw Object.assign(
      new Error(`Extension '${ext}' is not allowed for image files`),
      { status: 400 }
    );
  }

  const rootDir = baseDirOverride || PROJECT_ROOT;
  const baseDir =
    dir === "subs"
      ? path.join(rootDir, "public", "subs")
      : path.join(rootDir, "public");

  const resolved = path.resolve(baseDir, name);

  if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
    throw Object.assign(new Error("Path traversal detected"), { status: 400 });
  }
  return resolved;
}

export const SubtitleEntrySchema = z.object({
  text: z.string(),
  startMs: z
    .number()
    .finite()
    .min(0, "startMs must be >= 0"),
  durationMs: z
    .number()
    .finite()
    .positive("durationMs must be > 0"),
  tokens: z
    .array(
      z.object({
        text: z.string(),
        fromMs: z.number().finite(),
        toMs: z.number().finite(),
      })
    )
    .optional()
    .default([]),
});

export function validateSubtitleEntry(entry) {
  const result = SubtitleEntrySchema.safeParse(entry);
  if (!result.success) {
    const msg = result.error.issues.map((i) => i.message).join("; ");
    throw new Error(msg);
  }
  return true;
}

export const SubtitlesPayloadSchema = z.object({
  jsonName: z.string().min(1),
  subtitles: z.array(SubtitleEntrySchema),
});

export const VideoInputSchema = z.object({
  date: z.string(),
  bannerTag: z.string().optional().default("PHỤNG VỤ LỜI CHÚA HÀNG NGÀY"),
  feastName: z.string(),
  readingType: z.string(),
  bibleRef: z.string(),
  quote: z.string(),
  audioFile: z.string(),
  introAudioFile: z.string().optional().default("piano_intro.mp3"),
  outroAudioFile: z.string().optional().default("piano_outro.mp3"),
  imageFile: z.string().default("cross.jpg"),
  imagePositionY: z.number().optional().default(50),
  bgImageFile: z.string().optional(),
  season: z.enum(["ORDINARY", "LENT_ADVENT", "EASTER_CHRISTMAS", "MARTYR"]).default("EASTER_CHRISTMAS"),
  websiteUrl: z.string().optional().default("loichuamoingay.org"),
});
