import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import multer from "multer";
import { exec, execFile, spawn } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import {
  validateFilename,
  SubtitleEntrySchema,
  SubtitlesPayloadSchema,
  VideoInputSchema,
  ALLOWED_MIME_TYPES,
  ALL_UPLOAD_EXTENSIONS,
} from "./validation.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Library managed by loi-chua-hang-ngay. This is deliberately configured on the
// server: browsers must never be allowed to submit arbitrary local paths.
const AUDIO_LIBRARY_ROOT = process.env.AUDIO_LIBRARY_ROOT || "/Users/tranthithuynhi/loi-chua-hang-ngay/private/audio";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// ── CORS: local-only by default ──────────────────────────────────────────────
const CORS_ORIGIN = process.env.CORS_ORIGIN || `http://localhost:${PORT}`;
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin === CORS_ORIGIN ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    },
  })
);

// ── Multer upload — type filter + size limit (memoryStorage → fixed overwrite) ─
const UPLOAD_MAX_MB = process.env.UPLOAD_MAX_MB
  ? parseInt(process.env.UPLOAD_MAX_MB, 10)
  : 50;

const AUDIO_MIME_TYPES = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav"]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".m4a"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
    const extOk = ALL_UPLOAD_EXTENSIONS.has(ext);
    if (!mimeOk || !extOk) {
      return cb(
        Object.assign(
          new Error(
            `File type '${file.mimetype}' (${ext}) is not allowed. Allowed types: images (jpeg/png/webp) and media (mp3/wav/mp4/mkv/mov/webm).`
          ),
          { status: 400 }
        )
      );
    }
    cb(null, true);
  },
});

function handleUpload(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          error: `File exceeds the ${UPLOAD_MAX_MB} MB size limit`,
        });
      }
      return res.status(err.status || 400).json({ success: false, error: err.message });
    }
    next();
  });
}

function cleanupLegacyUploads() {
  try {
    const publicDir = path.join(__dirname, "public");
    if (!fs.existsSync(publicDir)) return;
    const files = fs.readdirSync(publicDir);
    let count = 0;
    for (const f of files) {
      if (f.startsWith("upload_")) {
        try {
          fs.unlinkSync(path.join(publicDir, f));
          count++;
          console.log(`[CLEANUP] Deleted legacy file: ${f}`);
        } catch (_) {}
      }
    }
    if (count > 0) {
      console.log(`[CLEANUP] Cleaned up ${count} legacy upload_* files.`);
    }
  } catch (e) {
    console.warn("[CLEANUP] Error during legacy cleanup:", e.message);
  }
  cleanupLegacySubtitles();
}

// ── Upload route (BEFORE express.json()) ─────────────────────────────────────
// Each upload OVERWRITES a single fixed file: current_audio.<ext>, current_image.<ext>, logo.<ext>, etc.
// Old variants with a different extension are deleted first to avoid orphaned files.
app.post("/api/upload-file", handleUpload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  const ext = path.extname(req.file.originalname).toLowerCase() || ".bin";
  const fileType = req.body?.fileType || req.query?.fileType;

  let prefix = "current_image";
  if (fileType === "audio") prefix = "current_audio";
  else if (fileType === "image") prefix = "current_image";
  else if (fileType === "logo") prefix = "logo";
  else if (fileType === "introAudio") prefix = "piano_intro";
  else if (fileType === "outroAudio") prefix = "piano_outro";
  else {
    const isAudio =
      AUDIO_MIME_TYPES.has(req.file.mimetype) || AUDIO_EXTENSIONS.has(ext);
    prefix = isAudio ? "current_audio" : "current_image";
  }

  const finalName = `${prefix}${ext}`;
  const publicDir = path.join(__dirname, "public");
  const destPath = path.join(publicDir, finalName);

  // Delete any stale file with same prefix but different extension
  try {
    const existing = fs.readdirSync(publicDir).filter(
      (f) => f.startsWith(prefix + ".") && f !== finalName
    );
    for (const old of existing) {
      fs.unlinkSync(path.join(publicDir, old));
      console.log(`[CLEANUP] Removed old ${prefix}: ${old}`);
    }
  } catch (e) {
    console.warn("[CLEANUP] Could not remove old file:", e.message);
  }

  // Also clean any legacy upload_* files
  cleanupLegacyUploads();

  // Write (overwrite) the new file
  fs.writeFileSync(destPath, req.file.buffer);
  const fileUrl = `http://localhost:${PORT}/${finalName}`;
  console.log(`[UPLOAD] Saved (overwrite): ${finalName}`);

  let durationSeconds = null;
  if (fileType === "audio" || isAudio) {
    durationSeconds = getExactAudioDuration(destPath);
    console.log(`[UPLOAD] Measured exact audio duration: ${durationSeconds}s`);
  }

  res.json({ success: true, filename: finalName, url: fileUrl, durationSeconds });
});

function getExactAudioDuration(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { timeout: 5000 }
    ).toString().trim();
    const dur = parseFloat(output);
    return isFinite(dur) && dur > 0 ? parseFloat(dur.toFixed(2)) : null;
  } catch (e) {
    console.warn("[ffprobe] Could not get audio duration:", e.message);
    return null;
  }
}

// ── Regular middleware ────────────────────────────────────────────────────────
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ limit: "4mb", extended: true }));
app.use(express.static("public"));

function normalizeReadingType(readingType) {
  return String(readingType || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function getLibraryAudioSpec(readingType) {
  const value = normalizeReadingType(readingType);
  if (value === "tin mung" || value === "phuc am" || value === "gospel") {
    return { directory: "gospels", prefix: "gospel_" };
  }
  if (/^bai doc (1|i)$/.test(value)) {
    return { directory: path.join("readings", "r1"), prefix: "r1_" };
  }
  if (/^bai doc (2|ii)$/.test(value)) {
    return { directory: path.join("readings", "r2"), prefix: "r2_" };
  }
  return null;
}

/**
 * `1 Ga 4,7-16` becomes `1_Ga_47-16` for audio and `1_Ga_4_7-16` for SRT.
 */
export function getBibleReferenceKeys(bibleRef) {
  const value = String(bibleRef || "").normalize("NFC").trim();
  if (!value) return null;

  const withUnderscores = value.replace(/\s+/g, "_");
  const audioKey = withUnderscores.replace(/[,;]/g, "").replace(/_+/g, "_");
  const subtitleKey = withUnderscores.replace(/[,;]/g, "_").replace(/_+/g, "_");
  const validKey = (key) => /^[\p{L}\p{N}_-]+$/u.test(key) && !key.includes("..") && !key.startsWith("_");

  if (!validKey(audioKey) || !validKey(subtitleKey)) return null;
  return { audioKey, subtitleKey };
}

function isInsideLibrary(candidate) {
  const root = path.resolve(AUDIO_LIBRARY_ROOT);
  const resolved = path.resolve(candidate);
  return resolved.startsWith(root + path.sep);
}

export function findLibraryAssets(readingType, bibleRef) {
  const keys = getBibleReferenceKeys(bibleRef);
  const audioSpec = getLibraryAudioSpec(readingType);
  if (!keys) return { error: "Kinh Thánh Ref không đúng định dạng tên file." };
  if (!audioSpec) return { error: "Loại Bài Đọc chưa được hỗ trợ." };

  const audioDir = path.resolve(AUDIO_LIBRARY_ROOT, audioSpec.directory);
  const subtitleDir = path.resolve(AUDIO_LIBRARY_ROOT, "sub");
  if (!isInsideLibrary(audioDir) || !isInsideLibrary(subtitleDir)) {
    return { error: "Đường dẫn thư viện audio không hợp lệ." };
  }

  let audio = null;
  for (const extension of [".mp3", ".wav"]) {
    const filename = `${audioSpec.prefix}${keys.audioKey}${extension}`;
    const filePath = path.join(audioDir, filename);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      audio = { filename, filePath, extension: extension.slice(1) };
      break;
    }
  }

  const subtitleFilename = `${keys.subtitleKey}.srt`;
  const subtitlePath = path.join(subtitleDir, subtitleFilename);
  let subtitle = null;
  if (fs.existsSync(subtitlePath) && fs.statSync(subtitlePath).isFile()) {
    const subtitles = parseSrt(fs.readFileSync(subtitlePath, "utf-8"));
    subtitle = { filename: subtitleFilename, filePath: subtitlePath, subtitleCount: subtitles.length };
  }

  return { keys, audio, subtitle };
}

function libraryLookupHandler(req, res) {
  const result = findLibraryAssets(req.query.readingType, req.query.bibleRef);
  if (result.error) return res.status(400).json({ success: false, error: result.error });
  res.json({
    success: true,
    audioKey: result.keys.audioKey,
    subtitleKey: result.keys.subtitleKey,
    audio: result.audio && { found: true, filename: result.audio.filename, format: result.audio.extension },
    subtitle: result.subtitle && { found: true, filename: result.subtitle.filename, subtitleCount: result.subtitle.subtitleCount },
  });
}

app.get("/api/library-assets", libraryLookupHandler);

app.get("/api/library-assets/audio-preview", (req, res) => {
  const result = findLibraryAssets(req.query.readingType, req.query.bibleRef);
  if (result.error) return res.status(400).json({ success: false, error: result.error });
  if (!result.audio) return res.status(404).json({ success: false, error: "Không tìm thấy audio trong thư viện." });
  res.sendFile(result.audio.filePath);
});

app.get("/api/library-assets/subtitles", (req, res) => {
  const result = findLibraryAssets(req.query.readingType, req.query.bibleRef);
  if (result.error) return res.status(400).json({ success: false, error: result.error });
  if (!result.subtitle) return res.status(404).json({ success: false, error: "Không tìm thấy phụ đề trong thư viện." });
  const subtitles = parseSrt(fs.readFileSync(result.subtitle.filePath, "utf-8"));
  res.json({ success: true, filename: result.subtitle.filename, subtitleCount: subtitles.length, subtitles });
});

app.post("/api/library-assets/import-audio", (req, res) => {
  const result = findLibraryAssets(req.body?.readingType, req.body?.bibleRef);
  if (result.error) return res.status(400).json({ success: false, error: result.error });
  if (!result.audio) return res.status(404).json({ success: false, error: "Không tìm thấy audio trong thư viện." });

  try {
    const publicDir = path.join(__dirname, "public");
    const targetName = `current_audio.${result.audio.extension}`;
    for (const file of fs.readdirSync(publicDir)) {
      if (file.startsWith("current_audio.") && file !== targetName) fs.unlinkSync(path.join(publicDir, file));
    }
    fs.copyFileSync(result.audio.filePath, path.join(publicDir, targetName));
    res.json({ success: true, filename: targetName, sourceFilename: result.audio.filename, url: `http://localhost:${PORT}/${targetName}` });
  } catch (error) {
    console.error("POST /api/library-assets/import-audio error:", error);
    res.status(500).json({ success: false, error: "Không thể nạp audio từ thư viện." });
  }
});

const TODAY_PATH = path.join(__dirname, "src", "data", "today.ts");

// A transcription can take several minutes on its first run (Whisper/model setup).
// Keep its state separately so the browser never has to wait on one long request.
let subtitleJob = {
  status: "idle",
  message: "Chưa có tác vụ tạo phụ đề nào.",
  startedAt: null,
  completedAt: null,
  audioFile: null,
  quality: null,
  error: null,
};

function publicSubtitleJob() {
  return { ...subtitleJob };
}

// ── GET /api/data ─────────────────────────────────────────────────────────────
app.get("/api/data", (_req, res) => {
  try {
    const content = fs.readFileSync(TODAY_PATH, "utf-8");
    // Start after the assignment, not the `{` in `import { VideoInput }`.
    // The old parser therefore always failed and returned the fallback data.
    const assignment = content.indexOf("export const videoData: VideoInput =");
    const firstBrace = assignment === -1 ? -1 : content.indexOf("{", assignment);
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      const jsonStr = content.substring(firstBrace, lastBrace + 1);
      return res.json(JSON.parse(jsonStr));
    }
  } catch (e) {
    console.error("Error reading today.ts data:", e);
  }
  res.json({
    date: "05/08/2026",
    bannerTag: "PHỤNG VỤ LỜI CHÚA HÀNG NGÀY",
    feastName: "Các thánh Mác-ta, Ma-ri-a và La-da-rô",
    readingType: "Bài Đọc 1",
    bibleRef: "1 Ga 4,7-16",
    quote: "\u201cNếu chúng ta yêu thương nhau, thì Thiên Chúa ở lại trong chúng ta.\u201d",
    audioFile: "audio.mp3",
    imageFile: "cross.jpg",
    season: "EASTER_CHRISTMAS",
    imagePositionY: 50,
  });
});

// ── POST /api/data ─────────────────────────────────────────────────────────────
app.post("/api/data", (req, res) => {
  const sanitizeFilename = (val) => {
    if (!val || typeof val !== "string") return val;
    if (val.startsWith("http://") || val.startsWith("https://") || val.startsWith("blob:")) {
      return path.basename(val.split("?")[0].split("#")[0]);
    }
    return path.basename(val);
  };

  const cleanAudioName = sanitizeFilename(req.body.audioFile) || "current_audio.mp3";
  let audioDuration = req.body.audioDurationSeconds;
  const audioFilePath = path.join(__dirname, "public", cleanAudioName);
  if ((!audioDuration || audioDuration <= 0) && fs.existsSync(audioFilePath)) {
    audioDuration = getExactAudioDuration(audioFilePath) || undefined;
  }

  const sanitizedBody = {
    ...req.body,
    imageFile: sanitizeFilename(req.body.imageFile) || "cross.jpg",
    audioFile: cleanAudioName,
    audioDurationSeconds: audioDuration,
    bgImageFile: req.body.bgImageFile ? sanitizeFilename(req.body.bgImageFile) : undefined,
    logoFile: req.body.logoFile ? sanitizeFilename(req.body.logoFile) : "logo.png",
    introAudioFile: req.body.introAudioFile ? sanitizeFilename(req.body.introAudioFile) : "piano_intro.mp3",
    outroAudioFile: req.body.outroAudioFile ? sanitizeFilename(req.body.outroAudioFile) : "piano_outro.mp3",
  };

  const result = VideoInputSchema.safeParse(sanitizedBody);
  if (!result.success) {
    return res
      .status(400)
      .json({ success: false, error: result.error.issues.map((i) => i.message).join("; ") });
  }
  const data = result.data;
  const newContent = `import { VideoInput } from "./videoInput";\n\nexport const videoData: VideoInput = ${JSON.stringify(data, null, 2)};\n`;
  try {
    fs.writeFileSync(TODAY_PATH, newContent, "utf-8");
    res.json({ success: true, data });
  } catch (e) {
    console.error("Error writing today.ts:", e);
    res.status(500).json({ success: false, error: "Failed to save data" });
  }
});

function cleanupLegacySubtitles() {
  try {
    const subsDir = path.join(__dirname, "public", "subs");
    if (!fs.existsSync(subsDir)) return;
    const files = fs.readdirSync(subsDir);
    let count = 0;
    for (const f of files) {
      if (f !== "current_subtitles.json" && f !== "current_subtitles.quality.json") {
        try {
          fs.unlinkSync(path.join(subsDir, f));
          count++;
        } catch (_) {}
      }
    }
    if (count > 0) {
      console.log(`[CLEANUP] Cleaned up ${count} legacy subtitle JSON files.`);
    }
  } catch (e) {
    console.warn("[CLEANUP] Error cleaning legacy subtitles:", e.message);
  }
}

// ── GET /api/subtitles ────────────────────────────────────────────────────────
app.get("/api/subtitles", (req, res) => {
  try {
    const currentSubPath = path.join(__dirname, "public", "subs", "current_subtitles.json");
    if (fs.existsSync(currentSubPath)) {
      const jsonStr = fs.readFileSync(currentSubPath, "utf-8");
      return res.json({ success: true, jsonName: "current_subtitles.json", subtitles: JSON.parse(jsonStr) });
    }

    // Fallback: check audioFile specific path for backwards compatibility
    let audioFile = String(req.query.audioFile || "audio.mp3");
    if (audioFile.startsWith("http")) {
      audioFile = path.basename(audioFile);
    }
    validateFilename(audioFile, "media", "public");

    const jsonName = audioFile.replace(/\.(mp4|mkv|mov|webm|mp3|wav)$/i, ".json");
    const subPath = validateFilename(jsonName, "sub", "subs");

    if (fs.existsSync(subPath)) {
      const jsonStr = fs.readFileSync(subPath, "utf-8");
      return res.json({ success: true, jsonName, subtitles: JSON.parse(jsonStr) });
    } else {
      return res.json({ success: false, error: "Chưa có file phụ đề" });
    }
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error("GET /api/subtitles error:", e);
    res.status(status).json({ success: false, error: e.message });
  }
});

// ── POST /api/subtitles ───────────────────────────────────────────────────────
app.post("/api/subtitles", (req, res) => {
  const parsed = SubtitlesPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    });
  }
  const { subtitles } = parsed.data;
  try {
    const subsDir = path.join(__dirname, "public", "subs");
    if (!fs.existsSync(subsDir)) {
      fs.mkdirSync(subsDir, { recursive: true });
    }

    const currentSubPath = path.join(subsDir, "current_subtitles.json");
    fs.writeFileSync(currentSubPath, JSON.stringify(subtitles, null, 2), "utf-8");
    console.log("Subtitles saved to current_subtitles.json");

    // Clean up any legacy sub JSON files
    cleanupLegacySubtitles();

    res.json({ success: true, jsonName: "current_subtitles.json" });
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error("POST /api/subtitles error:", e);
    res.status(status).json({ success: false, error: e.message });
  }
});

// ── Helper: SRT Subtitle Parser ──────────────────────────────────────────────
export function parseSrt(srtContent) {
  if (!srtContent || typeof srtContent !== "string") return [];
  const cleanText = srtContent.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const entries = cleanText.split(/\n\s*\n/);
  const subtitles = [];

  for (const entry of entries) {
    const lines = entry.trim().split("\n");
    if (lines.length < 2) continue;

    let timeLineIdx = 0;
    if (/^\d+$/.test(lines[0].trim())) {
      timeLineIdx = 1;
    }

    const timeLine = lines[timeLineIdx];
    if (!timeLine || !timeLine.includes("-->")) continue;

    const [startStr, endStr] = timeLine.split("-->").map(s => s.trim());
    const parseTime = (str) => {
      if (!str) return 0;
      const parts = str.replace(",", ".").split(":");
      if (parts.length === 3) {
        const h = parseFloat(parts[0]) || 0;
        const m = parseFloat(parts[1]) || 0;
        const s = parseFloat(parts[2]) || 0;
        return Math.round((h * 3600 + m * 60 + s) * 1000);
      } else if (parts.length === 2) {
        const m = parseFloat(parts[0]) || 0;
        const s = parseFloat(parts[1]) || 0;
        return Math.round((m * 60 + s) * 1000);
      }
      return Math.round((parseFloat(parts[0]) || 0) * 1000);
    };

    const startMs = parseTime(startStr);
    const endMs = parseTime(endStr);
    const durationMs = Math.max(200, endMs - startMs);
    const text = lines.slice(timeLineIdx + 1).join("\n").trim();

    if (text) {
      subtitles.push({
        text,
        startMs,
        durationMs,
      });
    }
  }

  return subtitles;
}

// ── POST /api/export-project ──────────────────────────────────────────────────
app.post("/api/export-project", (req, res) => {
  try {
    const { filename, project, srtContent } = req.body;

    let rawName = String(filename || "").trim();
    if (!rawName) {
      const ref = project?.metadata?.bibleRef || project?.metadata?.date || "project";
      rawName = String(ref)
        .replace(/[\/\\?%*:|"<>]/g, "-")
        .replace(/[,;]/g, "_")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^[-_]+|[-_]+$/g, "");
    }

    const baseNameWithoutExt = rawName.replace(/\.(srt|json)$/i, "");
    const targetDir = path.join(__dirname, "private", "audio", "sub");

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    let savedSrtPath = null;
    let savedJsonPath = null;

    // 1. Save .srt file if srtContent is provided or filename ends with .srt
    if (srtContent && typeof srtContent === "string") {
      const srtFileName = `${baseNameWithoutExt}.srt`;
      const targetSrtPath = path.join(targetDir, srtFileName);
      fs.writeFileSync(targetSrtPath, srtContent, "utf-8");
      savedSrtPath = `private/audio/sub/${srtFileName}`;
      console.log(`[EXPORT] Saved SRT subtitle file to ${targetSrtPath}`);
    }

    // 2. Save .json file if project is provided
    if (project && typeof project === "object") {
      const jsonFileName = `${baseNameWithoutExt}.json`;
      const targetJsonPath = path.join(targetDir, jsonFileName);
      fs.writeFileSync(targetJsonPath, JSON.stringify(project, null, 2), "utf-8");
      savedJsonPath = `private/audio/sub/${jsonFileName}`;
      console.log(`[EXPORT] Saved JSON backup file to ${targetJsonPath}`);
    }

    const primaryFile = savedSrtPath ? `${baseNameWithoutExt}.srt` : `${baseNameWithoutExt}.json`;
    const primaryPath = savedSrtPath || savedJsonPath;

    res.json({
      success: true,
      savedPath: primaryPath,
      filename: primaryFile,
      srtPath: savedSrtPath,
      jsonPath: savedJsonPath,
    });
  } catch (e) {
    console.error("POST /api/export-project error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── GET /api/project-by-ref ───────────────────────────────────────────────────
app.get("/api/project-by-ref", (req, res) => {
  try {
    const rawRef = String(req.query.ref || "").trim();
    if (!rawRef || rawRef.length < 2) {
      return res.json({ found: false });
    }

    const normalize = (str) =>
      String(str || "")
        .toLowerCase()
        .replace(/[\/\\?%*:|"<>]/g, "-")
        .replace(/[,;.]/g, "_")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^[-_]+|[-_]+$/g, "");

    const targetRefKey = normalize(rawRef);
    const targetDir = path.join(__dirname, "private", "audio", "sub");

    if (!fs.existsSync(targetDir)) {
      return res.json({ found: false });
    }

    const files = fs.readdirSync(targetDir);
    let matchedFile = null;

    // 1. Direct normalized match (prefer .srt then .json)
    for (const f of files) {
      if (f.endsWith(".srt") || f.endsWith(".json")) {
        const fileKey = normalize(f.replace(/\.(srt|json)$/i, ""));
        if (fileKey === targetRefKey) {
          matchedFile = f;
          if (f.endsWith(".srt")) break; // Priority on SRT
        }
      }
    }

    // 2. Fuzzy match if not matched directly
    if (!matchedFile) {
      for (const f of files) {
        if (f.endsWith(".srt") || f.endsWith(".json")) {
          const fileKey = normalize(f.replace(/\.(srt|json)$/i, ""));
          if (fileKey.length >= 3 && targetRefKey.length >= 3) {
            if (fileKey.includes(targetRefKey) || targetRefKey.includes(fileKey)) {
              matchedFile = f;
              if (f.endsWith(".srt")) break;
            }
          }
        }
      }
    }

    if (!matchedFile) {
      return res.json({ found: false });
    }

    const fullPath = path.join(targetDir, matchedFile);
    let subtitles = [];
    let metadata = {};

    if (matchedFile.endsWith(".srt")) {
      const srtText = fs.readFileSync(fullPath, "utf-8");
      subtitles = parseSrt(srtText);
      metadata = { bibleRef: rawRef };
    } else {
      const content = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
      subtitles = content.subtitles || (Array.isArray(content) ? content : []);
      metadata = content.metadata || {};
    }

    res.json({
      found: true,
      filename: matchedFile,
      savedPath: `private/audio/sub/${matchedFile}`,
      subtitleCount: subtitles.length,
      metadata: metadata,
      subtitles: subtitles,
    });
  } catch (e) {
    console.error("GET /api/project-by-ref error:", e);
    res.json({ found: false, error: e.message });
  }
});

// ── POST /api/subtitles/clear ────────────────────────────────────────────────
app.post("/api/subtitles/clear", (_req, res) => {
  try {
    const currentSubPath = path.join(__dirname, "public", "subs", "current_subtitles.json");
    fs.writeFileSync(currentSubPath, "[]", "utf-8");
    res.json({ success: true, message: "Đã làm sạch phụ đề trên server" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

let currentSubtitleProcess = null;

// ── GET /api/create-subtitles/status ─────────────────────────────────────────
app.get("/api/create-subtitles/status", (_req, res) => {
  res.json({ success: true, job: publicSubtitleJob() });
});

// ── POST /api/create-subtitles ────────────────────────────────────────────────
app.post("/api/create-subtitles", (req, res) => {
  let audioFile = String(req.body.audioFile || "current_audio.mp3");
  if (audioFile.startsWith("http")) {
    audioFile = path.basename(audioFile);
  }

  let resolvedAudioPath;
  try {
    resolvedAudioPath = validateFilename(audioFile, "media", "public");
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, error: e.message });
  }

  if (!fs.existsSync(resolvedAudioPath)) {
    return res.status(400).json({ success: false, error: "Audio file not found on server" });
  }

  const force = req.body.force === true;
  if (subtitleJob.status === "running") {
    if (force && currentSubtitleProcess) {
      console.log("[Whisper] Force killing previous running subtitle process...");
      try {
        currentSubtitleProcess.kill("SIGTERM");
      } catch (_) {}
    } else {
      return res.status(409).json({
        success: false,
        error: "Phụ đề đang được tạo. Vui lòng chờ tác vụ hiện tại hoàn tất.",
        job: publicSubtitleJob(),
      });
    }
  }

  console.log("Generating subtitles for:", audioFile);
  subtitleJob = {
    status: "running",
    message: "Đang khởi động Whisper AI. Lần chạy đầu có thể mất vài phút để chuẩn bị mô hình.",
    startedAt: new Date().toISOString(),
    completedAt: null,
    audioFile,
    quality: null,
    error: null,
  };

  const child = execFile(
    "node",
    ["sub.mjs", resolvedAudioPath, ...(force ? ["--force"] : [])],
    { cwd: __dirname, timeout: 600000, maxBuffer: 10 * 1024 * 1024 },
    (error, stdout, stderr) => {
      currentSubtitleProcess = null;
      if (error) {
        console.error("Whisper error:", stderr);
        subtitleJob = {
          ...subtitleJob,
          status: "failed",
          message: "Không thể tạo phụ đề. Kiểm tra Whisper hoặc tệp audio.",
          completedAt: new Date().toISOString(),
          error: (stderr || error.message || "Subtitle generation failed").trim().slice(0, 1000),
        };
        return;
      }
      console.log("Subtitles generated successfully");
      const qualityPath = path.join(__dirname, "public", "subs", "current_subtitles.quality.json");
      let quality = null;
      try {
        if (fs.existsSync(qualityPath)) quality = JSON.parse(fs.readFileSync(qualityPath, "utf-8"));
      } catch (qualityError) {
        console.warn("Could not read subtitle quality report:", qualityError);
      }
      subtitleJob = {
        ...subtitleJob,
        status: "completed",
        message: "Đã tạo và nạp phụ đề mới.",
        completedAt: new Date().toISOString(),
        quality,
        error: null,
      };
    }
  );

  currentSubtitleProcess = child;

  child.on("error", (error) => {
    currentSubtitleProcess = null;
    subtitleJob = {
      ...subtitleJob,
      status: "failed",
      message: "Không thể khởi động tiến trình tạo phụ đề.",
      completedAt: new Date().toISOString(),
      error: error.message,
    };
  });

  res.status(202).json({ success: true, job: publicSubtitleJob() });
});

// ── Active Render Process State & Cancellation ─────────────────────────────────
let activeRenderProcess = null;
let activeRenderJob = {
  status: "idle", // "idle" | "rendering" | "completed" | "cancelled" | "error"
  progress: 0,
  renderedFrames: 0,
  totalFrames: 0,
  error: null,
  videoUrl: null,
};

// ── GET /api/render-status ────────────────────────────────────────────────────
app.get("/api/render-status", (_req, res) => {
  res.json(activeRenderJob);
});

// ── POST /api/render-video ────────────────────────────────────────────────────
app.post("/api/render-video", (_req, res) => {
  if (activeRenderProcess || activeRenderJob.status === "rendering") {
    return res.status(400).json({ success: false, error: "Đã có tiến trình render đang chạy." });
  }

  console.log("Rendering video MP4 (Target Bitrate: 15M, Color Space: bt709, HW Accel: if-possible, JPEG Quality: 100)...");
  
  activeRenderJob = {
    status: "rendering",
    progress: 0,
    renderedFrames: 0,
    totalFrames: 0,
    error: null,
    videoUrl: null,
  };

  const child = spawn(
    "npx",
    [
      "remotion",
      "render",
      "CatholicVideo",
      "public/output.mp4",
      "--video-bitrate=15M",
      "--color-space=bt709",
      "--hardware-acceleration=if-possible",
      "--jpeg-quality=100",
      "--overwrite"
    ],
    { cwd: __dirname, detached: true }
  );

  activeRenderProcess = child;

  const parseLog = (chunk) => {
    if (activeRenderJob.status === "cancelled") return;
    const text = chunk.toString();
    
    // Check for frame counts e.g. 150/450 or Rendered 150 of 450
    const frameMatch = text.match(/(\d+)\/(\d+)/) || text.match(/(\d+)\s+of\s+(\d+)/i);
    if (frameMatch) {
      const current = parseInt(frameMatch[1], 10);
      const total = parseInt(frameMatch[2], 10);
      if (total > 0 && current <= total) {
        activeRenderJob.renderedFrames = current;
        activeRenderJob.totalFrames = total;
        activeRenderJob.progress = Math.min(100, Math.round((current / total) * 100));
      }
    } else {
      // Check for percentages e.g. 45%
      const percentMatch = text.match(/(\d{1,3})%/);
      if (percentMatch) {
        const p = parseInt(percentMatch[1], 10);
        if (p >= 0 && p <= 100) {
          activeRenderJob.progress = Math.max(activeRenderJob.progress, p);
        }
      }
    }
  };

  if (child.stdout) child.stdout.on("data", parseLog);
  if (child.stderr) child.stderr.on("data", parseLog);

  child.on("close", (code) => {
    activeRenderProcess = null;
    if (activeRenderJob.status === "cancelled") {
      console.log("Render process tree exited after cancellation.");
      return;
    }
    if (code === 0) {
      activeRenderJob.status = "completed";
      activeRenderJob.progress = 100;
      activeRenderJob.videoUrl = "/output.mp4";
      console.log("Render completed successfully");
    } else {
      activeRenderJob.status = "error";
      activeRenderJob.error = `Render failed with code ${code}`;
      console.error("Render failed with code:", code);
    }
  });

  res.json({ success: true, message: "Đã bắt đầu tiến trình render video MP4." });
});

// ── POST /api/cancel-render ───────────────────────────────────────────────────
app.post("/api/cancel-render", (_req, res) => {
  activeRenderJob.status = "cancelled";
  activeRenderJob.progress = 0;

  if (activeRenderProcess && activeRenderProcess.pid) {
    console.log(`Killing render process group -${activeRenderProcess.pid}...`);
    try {
      process.kill(-activeRenderProcess.pid, "SIGKILL");
    } catch (e) {
      try {
        activeRenderProcess.kill("SIGKILL");
      } catch (_) {}
    }
    activeRenderProcess = null;
    return res.json({ success: true, message: "Đã hủy tiến trình render video thành công." });
  }

  res.json({ success: true, message: "Đã đặt trạng thái hủy render." });
});



// ── Serve Main Studio Web Page ─────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "studio.html"));
});

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url).endsWith(path.basename(process.argv[1]));
if (isDirectRun && !process.env.NODE_TEST_CONTEXT) {
  app.listen(PORT, () => {
    console.log(`✝️  Studio Web App running at http://localhost:${PORT}`);
    console.log(`   CORS origin: ${CORS_ORIGIN}`);
    console.log(`   Upload limit: ${UPLOAD_MAX_MB} MB`);
    cleanupLegacyUploads();
  });
}
