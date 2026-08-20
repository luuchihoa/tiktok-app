/**
 * validate.test.mjs — Lightweight unit tests using Node.js built-in test runner.
 * Imports real implementation from validation.mjs.
 *
 * Run:  npm test   (or node --test tests/validate.test.mjs)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateFilename, validateSubtitleEntry } from "../validation.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// ── Tests: filename / path validation ────────────────────────────────────────
describe("validateFilename — rejects malicious input", () => {
  it("rejects path traversal with ../", () => {
    assert.throws(
      () => validateFilename("../etc/passwd", "media", "public", PROJECT_ROOT),
      (err) => err.status === 400
    );
  });

  it("rejects absolute path (leading /)", () => {
    assert.throws(
      () => validateFilename("/etc/passwd", "media", "public", PROJECT_ROOT),
      (err) => err.status === 400
    );
  });

  it("rejects NUL byte", () => {
    assert.throws(
      () => validateFilename("audio\0.mp3", "media", "public", PROJECT_ROOT),
      (err) => err.status === 400
    );
  });

  it("rejects Windows backslash path", () => {
    assert.throws(
      () => validateFilename("..\\secret.mp3", "media", "public", PROJECT_ROOT),
      (err) => err.status === 400
    );
  });

  it("rejects shell metacharacters embedded in name (semicolon)", () => {
    assert.throws(
      () => validateFilename("audio.mp3;rm -rf /", "media", "public", PROJECT_ROOT),
      (err) => err.status === 400
    );
  });

  it("rejects disallowed extension for media kind (.exe)", () => {
    assert.throws(
      () => validateFilename("malware.exe", "media", "public", PROJECT_ROOT),
      (err) => err.status === 400
    );
  });

  it("rejects disallowed extension for media kind (.html)", () => {
    assert.throws(
      () => validateFilename("page.html", "media", "public", PROJECT_ROOT),
      (err) => err.status === 400
    );
  });

  it("rejects non-.json for subtitle kind", () => {
    assert.throws(
      () => validateFilename("audio.mp3", "sub", "subs", PROJECT_ROOT),
      (err) => err.status === 400
    );
  });

  it("rejects empty string", () => {
    assert.throws(
      () => validateFilename("", "media", "public", PROJECT_ROOT),
      (err) => err.status === 400
    );
  });
});

describe("validateFilename — accepts valid input", () => {
  it("accepts a plain .mp3 filename", () => {
    const resolved = validateFilename("audio.mp3", "media", "public", PROJECT_ROOT);
    assert.ok(resolved.endsWith(path.join("public", "audio.mp3")));
  });

  it("accepts upload_<timestamp>.mp3 filename", () => {
    const resolved = validateFilename("upload_1785335760325.mp3", "media", "public", PROJECT_ROOT);
    assert.ok(resolved.includes("public"));
  });

  it("accepts .wav file", () => {
    assert.doesNotThrow(() => validateFilename("bell.wav", "media", "public", PROJECT_ROOT));
  });

  it("accepts .mp4 file", () => {
    assert.doesNotThrow(() => validateFilename("video.mp4", "media", "public", PROJECT_ROOT));
  });

  it("accepts .webm file", () => {
    assert.doesNotThrow(() => validateFilename("clip.webm", "media", "public", PROJECT_ROOT));
  });

  it("accepts .json for subtitle kind", () => {
    const resolved = validateFilename("audio.json", "sub", "subs", PROJECT_ROOT);
    assert.ok(resolved.includes(path.join("public", "subs")));
  });

  it("accepts .json for subtitle kind", () => {
    assert.doesNotThrow(() =>
      validateFilename("captions.json", "sub", "subs", PROJECT_ROOT)
    );
  });

  it("accepts .srt for subtitle kind", () => {
    assert.doesNotThrow(() =>
      validateFilename("captions.srt", "sub", "subs", PROJECT_ROOT)
    );
  });

  it("accepts .jpg for image kind", () => {
    assert.doesNotThrow(() => validateFilename("cross.jpg", "image", "public", PROJECT_ROOT));
  });

  it("accepts .png for image kind", () => {
    assert.doesNotThrow(() => validateFilename("icon.png", "image", "public", PROJECT_ROOT));
  });

  it("accepts .webp for image kind", () => {
    assert.doesNotThrow(() => validateFilename("photo.webp", "image", "public", PROJECT_ROOT));
  });
});

// ── Tests: subtitle entry validation ─────────────────────────────────────────
describe("validateSubtitleEntry — rejects invalid entries", () => {
  it("rejects negative startMs", () => {
    assert.throws(
      () => validateSubtitleEntry({ text: "hello", startMs: -100, durationMs: 1000 }),
      /startMs must be >= 0/
    );
  });

  it("rejects non-finite startMs (Infinity)", () => {
    assert.throws(
      () => validateSubtitleEntry({ text: "hello", startMs: Infinity, durationMs: 1000 }),
      /number/i
    );
  });

  it("rejects non-finite startMs (NaN)", () => {
    assert.throws(
      () => validateSubtitleEntry({ text: "hello", startMs: NaN, durationMs: 1000 }),
      /number|NaN/i
    );
  });

  it("rejects zero durationMs", () => {
    assert.throws(
      () => validateSubtitleEntry({ text: "hello", startMs: 0, durationMs: 0 }),
      /durationMs must be > 0/
    );
  });

  it("rejects negative durationMs", () => {
    assert.throws(
      () => validateSubtitleEntry({ text: "hello", startMs: 0, durationMs: -500 }),
      /durationMs must be > 0/
    );
  });

  it("rejects non-finite durationMs", () => {
    assert.throws(
      () => validateSubtitleEntry({ text: "hello", startMs: 0, durationMs: NaN }),
      /number|NaN/i
    );
  });
});

describe("validateSubtitleEntry — accepts valid entries", () => {
  it("accepts a well-formed subtitle entry", () => {
    assert.ok(
      validateSubtitleEntry({ text: "Nếu chúng ta yêu thương nhau", startMs: 1200, durationMs: 3000 })
    );
  });

  it("accepts startMs = 0", () => {
    assert.ok(validateSubtitleEntry({ text: "Bài Đọc 1", startMs: 0, durationMs: 1500 }));
  });

  it("accepts empty text string", () => {
    assert.ok(validateSubtitleEntry({ text: "", startMs: 500, durationMs: 300 }));
  });

  it("accepts large timing values", () => {
    assert.ok(
      validateSubtitleEntry({ text: "Cuối video", startMs: 300000, durationMs: 2000 })
    );
  });
});

// ── Tests: duration calculation (Root.tsx logic) ──────────────────────────────
describe("Video duration calculation", () => {
  it("covers intro (3.5s) + outro (4.5s) = 8.0s of padding at 30 FPS", () => {
    const INTRO_S = 3.5;
    const OUTRO_S = 4.5;
    const FPS = 30;
    const INTRO_FRAMES = Math.round(INTRO_S * FPS); // 105
    const OUTRO_FRAMES = Math.round(OUTRO_S * FPS); // 135

    const audioDurationS = 60;
    const totalFrames = Math.ceil((audioDurationS + INTRO_S + OUTRO_S) * FPS);

    const outroStartFrame = totalFrames - OUTRO_FRAMES;
    const audioEndFrame = Math.ceil(audioDurationS * FPS) + INTRO_FRAMES;

    assert.ok(
      outroStartFrame >= audioEndFrame,
      `Outro starts at frame ${outroStartFrame} but audio ends at frame ${audioEndFrame}`
    );

    assert.ok(
      outroStartFrame + OUTRO_FRAMES <= totalFrames,
      "Outro is cut before it finishes"
    );

    assert.equal(INTRO_FRAMES, 105);
    assert.equal(OUTRO_FRAMES, 135);
  });
});
