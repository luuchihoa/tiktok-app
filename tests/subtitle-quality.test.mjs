import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { auditSubtitles, formatSubtitleLines, segmentCaptions } from "../subtitle-quality.mjs";

const token = (text, startMs, endMs) => ({ text, startMs, endMs });

describe("segmentCaptions", () => {
  it("merges a short punctuation fragment instead of creating a flash", () => {
    const subtitles = segmentCaptions([
      token(" Nếu", 0, 180), token(" chúng", 180, 420), token(" ta", 420, 610),
      token(" yêu", 610, 820), token(" thương", 820, 1100), token(" nhau,", 1100, 1380),
      token(" thì", 1380, 1560), token(" Thiên", 1560, 1820), token(" Chúa.", 1820, 2100),
    ]);
    assert.equal(subtitles.length, 1);
    assert.ok(subtitles[0].durationMs >= 1100);
    assert.match(subtitles[0].text, /Thiên Chúa/);
  });

  it("produces positive, ordered timestamps", () => {
    const subtitles = segmentCaptions([
      token(" Bài", 200, 400), token(" đọc", 400, 650), token(" một.", 650, 1000),
      token(" Anh", 1800, 2000), token(" em", 2000, 2200), token(" thân", 2200, 2450), token(" mến.", 2450, 2800),
    ]);
    subtitles.forEach((subtitle, index) => {
      assert.ok(subtitle.durationMs > 0);
      if (index > 0) assert.ok(subtitle.startMs >= subtitles[index - 1].startMs);
    });
  });

  it("keeps a short dialogue cue separate when followed by a half-second pause", () => {
    const subtitles = segmentCaptions([
      token(" Thưa", 0, 180), token(" Thầy:", 180, 420),
      token(" chúng", 950, 1150), token(" con", 1150, 1320), token(" xin", 1320, 1500), token(" đi.", 1500, 1780),
    ]);
    assert.equal(subtitles.length, 2);
    assert.match(subtitles[0].text, /Thưa Thầy:/);
    assert.match(subtitles[1].text, /chúng con xin đi/);
  });
});

describe("auditSubtitles", () => {
  it("flags zero-duration and overly long subtitles", () => {
    const report = auditSubtitles([
      { text: "ta.", startMs: 1000, durationMs: 0 },
      { text: "Một đoạn quá dài để hiển thị dễ đọc trên màn hình video dọc", startMs: 1000, durationMs: 3000 },
    ]);
    assert.equal(report.summary.errors, 1);
    assert.ok(report.summary.warnings >= 1);
  });
});

describe("formatSubtitleLines", () => {
  it("balances a long caption into no more than two lines", () => {
    const formatted = formatSubtitleLines("Tình yêu của Thiên Chúa đối với chúng ta được biểu lộ như thế này.");
    const lines = formatted.split("\n");
    assert.equal(lines.length, 2);
    // A two-line fallback must still cope with unusually long source text;
    // normal generated chunks are capped much shorter by segmentCaptions.
    assert.ok(lines.every((line) => line.length <= 35));
    assert.match(formatted, /Thiên Chúa/);
  });
});
