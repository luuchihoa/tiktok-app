import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import path from "path";
import { execFileSync } from "child_process";
import {
  WHISPER_LANG,
  WHISPER_MODEL,
  WHISPER_PATH,
  WHISPER_VERSION,
} from "./whisper-config.mjs";
import {
  installWhisperCpp,
  downloadWhisperModel,
  transcribe,
  toCaptions,
} from "@remotion/install-whisper-cpp";
import { auditSubtitles, segmentCaptions } from "./subtitle-quality.mjs";

const extractToTempAudioFile = (fileToTranscribe, tempOutFile) => {
  // Use execFileSync with an explicit argument array — never interpolate paths into a shell string
  execFileSync(
    "npx",
    ["remotion", "ffmpeg", "-i", fileToTranscribe, "-ar", "16000", tempOutFile, "-y"],
    { stdio: ["ignore", "ignore", "ignore"] }
  );
};

const subFile = async (filePath, fileName, folder) => {
  const subsDir = path.join(process.cwd(), "public", "subs");
  if (!existsSync(subsDir)) {
    mkdirSync(subsDir, { recursive: true });
  }

  const outPath = path.join(subsDir, "current_subtitles.json");

  const whisperCppOutput = await transcribe({
    inputPath: filePath,
    model: WHISPER_MODEL,
    tokenLevelTimestamps: true,
    whisperPath: WHISPER_PATH,
    whisperCppVersion: WHISPER_VERSION,
    printOutput: false,
    translateToEnglish: false,
    language: WHISPER_LANG,
    splitOnWord: true,
  });

  const { captions } = toCaptions({ whisperCppOutput });
  const pages = segmentCaptions(captions);
  const qualityReport = auditSubtitles(pages);

  writeFileSync(
    outPath,
    JSON.stringify(pages, null, 2),
  );
  writeFileSync(
    outPath.replace(/\.json$/, ".quality.json"),
    JSON.stringify(qualityReport, null, 2),
  );
  console.log(`Generated ${pages.length} subtitle segments (${qualityReport.summary.warnings} warnings).`);
};

const processVideo = async (fullPath, entry, directory) => {
  const ext = path.extname(fullPath).toLowerCase();
  const allowed = [".mp4", ".webm", ".mkv", ".mov", ".mp3", ".wav", ".m4a", ".aac"];
  if (!allowed.includes(ext)) {
    console.warn("Unsupported audio/video extension:", ext);
    return;
  }

  const isTranscribed = existsSync(
    path.join(
      process.cwd(),
      "public",
      "subs",
      "current_subtitles.json"
    )
  );
  const force = process.argv.includes("--force");
  if (isTranscribed && !force) {
    console.log("Subtitle file already exists. Use --force to regenerate it.");
    return;
  }

  console.log("Processing file", fullPath);

  const baseName = path.basename(entry, path.extname(entry));
  const tempWavFileName = `${baseName}_temp_${Date.now()}.wav`;
  const tempWavFilePath = path.join(process.cwd(), tempWavFileName);

  try {
    if (ext !== ".wav") {
      console.log("Extracting audio from file", entry);
      extractToTempAudioFile(fullPath, tempWavFilePath);
    }

    await subFile(
      ext === ".wav" ? fullPath : tempWavFilePath,
      entry,
      directory
    );
  } finally {
    if (ext !== ".wav" && existsSync(tempWavFilePath)) {
      try {
        unlinkSync(tempWavFilePath);
      } catch (_) {}
    }
  }
};

const main = async () => {
  await installWhisperCpp({
    to: WHISPER_PATH,
    version: WHISPER_VERSION,
  });

  await downloadWhisperModel({
    model: WHISPER_MODEL,
    folder: WHISPER_PATH,
  });

  const args = process.argv.slice(2);
  const inputPath = args[0];

  if (!inputPath) {
    console.error("Vui lòng truyền đường dẫn tới file video hoặc audio.");
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), inputPath);
  const entry = path.basename(fullPath);
  const directory = path.dirname(fullPath);

  await processVideo(fullPath, entry, directory);
};

main();
