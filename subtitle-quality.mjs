const MIN_DURATION_MS = 1100;
const MAX_DURATION_MS = 2800;
const MAX_WORDS = 8;
const MAX_CHARS = 42;
const MAX_LINES = 2;
const MAX_LINE_CHARS = 25;

const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;
const compactText = (tokens) => tokens.map((token) => token.text).join("").replace(/\s+/g, " ").trim();

export const normalizeSubtitleText = (text) => text
  .replace(/\bThiên chúa\b/gi, "Thiên Chúa")
  .replace(/\bĐức giê[- ]xu\b/gi, "Đức Giê-su")
  .replace(/\bJesu\b/gi, "Giê-su")
  .replace(/\bKito\b/gi, "Ki-tô")
  .replace(/\bTình mừng\b/gi, "Tin Mừng")
  .replace(/\bMát theo\b/gi, "Mát-thêu")
  .replace(/\bKanaan\b/gi, "Ca-na-an")
  .replace(/\bSidon\b/gi, "Xi-đôn")
  .replace(/\bDavid\b/gi, "Đa-vít")
  .replace(/\bYd-ra-en\b/gi, "Ít-ra-en")
  .replace(/\bLại ngài\b/gi, "Lạy Ngài")
  .replace(/\bdũ lòng\b/gi, "dủ lòng")
  .replace(/\bkhổ sợ\b/gi, "khổ sở")
  .replace(/\bBây giờ Đức\b/gi, "Bấy giờ Đức")
  .replace(/Gio-an-tông-đồ/gi, "Gioan Tông đồ")
  .replace(/\bPhạm ai\b/gi, "Phàm ai")
  .replace(/\bHệ ai\b/gi, "Hễ ai")
  .replace(/\btuyên sừng\b/gi, "tuyên xưng")
  .replace(/\s+([,.!?;:])/g, "$1")
  .replace(/\s{2,}/g, " ")
  .trim();

/** Split one caption into visually balanced lines for a vertical TikTok frame. */
export const formatSubtitleLines = (text) => {
  const normalized = normalizeSubtitleText(text.replace(/\s*\n\s*/g, " "));
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length < 4 || normalized.length <= MAX_LINE_CHARS) return normalized;

  const protectedPairs = new Set([
    "Thiên Chúa", "Đức Chúa", "Đức Giê-su", "Chúa Cha", "Con Một",
    "Thần Khí", "Đấng Cứu Độ", "Lời Chúa", "Tin Mừng",
  ]);
  let bestIndex = 1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const left = words.slice(0, index).join(" ");
    const right = words.slice(index).join(" ");
    const splitsProtectedPair = protectedPairs.has(`${words[index - 1]} ${words[index]}`);
    const overflow = Math.max(0, left.length - MAX_LINE_CHARS) + Math.max(0, right.length - MAX_LINE_CHARS);
    const score = Math.abs(left.length - right.length) + overflow * 4 + (splitsProtectedPair ? 40 : 0);
    if (score < bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  }
  return `${words.slice(0, bestIndex).join(" ")}\n${words.slice(bestIndex).join(" ")}`;
};

const makeChunk = (tokens, protectedFromMerge = false) => ({
  tokens,
  text: normalizeSubtitleText(compactText(tokens)),
  startMs: tokens[0].startMs,
  endMs: tokens.at(-1).endMs,
  protectedFromMerge,
});

const canMerge = (left, right) => {
  const merged = normalizeSubtitleText(`${left.text} ${right.text}`);
  return wordCount(merged) <= MAX_WORDS + 2 && merged.replace(/\s/g, "").length <= MAX_CHARS + 10;
};

/**
 * Turn Whisper word tokens into readable vertical-video subtitle chunks.
 * Chunks favour natural punctuation, short phrases, and a safe minimum display time.
 */
export const segmentCaptions = (captions) => {
  const chunks = [];
  let tokens = [];

  const flush = (protectedFromMerge = false) => {
    if (tokens.length) chunks.push(makeChunk(tokens, protectedFromMerge));
    tokens = [];
  };

  captions.forEach((token, index) => {
    const previous = tokens.at(-1);
    const gap = previous ? token.startMs - previous.endMs : 0;

    // A half-second pause is already perceptible in short-form video. Keep a
    // phrase before it independent, especially dialogue cues such as “Thưa Thầy:”.
    if (tokens.length && gap >= 450 && wordCount(compactText(tokens)) >= 2) flush(true);

    tokens.push(token);
    const text = compactText(tokens);
    const duration = token.endMs - tokens[0].startMs;
    const isPunctuation = /[.!?;:]/.test(token.text);
    const isHardLimit = wordCount(text) >= MAX_WORDS || text.replace(/\s/g, "").length >= MAX_CHARS || duration >= MAX_DURATION_MS;
    const isDialogueCue = /:/.test(token.text) && wordCount(text) >= 2;
    const isNaturalEnd = isPunctuation && duration >= 900;

    if (isHardLimit || isNaturalEnd || isDialogueCue || index === captions.length - 1) {
      flush(isDialogueCue);
    }
  });

  // Merge flashes with a neighbor whenever readability permits it.
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const isTooShort = chunk.endMs - chunk.startMs < MIN_DURATION_MS || wordCount(chunk.text) < 3;
    if (!isTooShort) continue;
    // Do not glue a dialogue cue / deliberate pause back onto its neighbor.
    if (chunk.protectedFromMerge || chunks[index - 1]?.protectedFromMerge) continue;
    if (index > 0 && canMerge(chunks[index - 1], chunk)) {
      const previous = chunks[index - 1];
      previous.tokens.push(...chunk.tokens);
      previous.text = normalizeSubtitleText(`${previous.text} ${chunk.text}`);
      previous.endMs = chunk.endMs;
      chunks.splice(index, 1);
      index -= 1;
    } else if (index + 1 < chunks.length && canMerge(chunk, chunks[index + 1])) {
      const next = chunks[index + 1];
      chunk.tokens.push(...next.tokens);
      chunk.text = normalizeSubtitleText(`${chunk.text} ${next.text}`);
      chunk.endMs = next.endMs;
      chunks.splice(index + 1, 1);
    }
  }

  return chunks.map((chunk, index) => {
    const next = chunks[index + 1];
    const startMs = Math.max(0, chunk.startMs - 180);
    const naturalEndMs = Math.max(chunk.endMs, startMs + MIN_DURATION_MS);
    const endMs = next ? Math.min(naturalEndMs, Math.max(startMs + 300, next.startMs - 180)) : naturalEndMs;
    return {
      text: formatSubtitleLines(chunk.text),
      startMs,
      durationMs: Math.max(300, endMs - startMs),
      tokens: chunk.tokens.map((token) => ({ text: token.text, fromMs: token.startMs, toMs: token.endMs })),
    };
  });
};

export const auditSubtitles = (subtitles) => {
  const issues = [];
  subtitles.forEach((subtitle, index) => {
    const number = index + 1;
    const words = wordCount(subtitle.text);
    const lines = subtitle.text.split("\n");
    const chars = subtitle.text.replace(/\s/g, "").length;
    if (!Number.isFinite(subtitle.startMs) || !Number.isFinite(subtitle.durationMs) || subtitle.durationMs <= 0) {
      issues.push({ severity: "error", segment: number, code: "invalid_timing", message: "Thời gian hiển thị không hợp lệ." });
    } else if (subtitle.durationMs < MIN_DURATION_MS) {
      issues.push({ severity: "warning", segment: number, code: "too_short", message: `Chỉ hiển thị ${(subtitle.durationMs / 1000).toFixed(1)} giây.` });
    }
    // A longer caption is fine when it has already been balanced into two
    // short lines. Warn only when it would still render as one crowded line.
    if (lines.length === 1 && (words > MAX_WORDS || chars > MAX_CHARS)) {
      issues.push({ severity: "warning", segment: number, code: "too_long", message: `${words} từ, ${chars} ký tự — nên rút ngắn cho video dọc.` });
    }
    if (lines.length > MAX_LINES || lines.some((line) => line.length > MAX_LINE_CHARS + 3)) {
      issues.push({ severity: "warning", segment: number, code: "line_layout", message: "Nên cân lại thành tối đa 2 dòng ngắn cho TikTok." });
    }
  });
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      segments: subtitles.length,
      errors: issues.filter((issue) => issue.severity === "error").length,
      warnings: issues.filter((issue) => issue.severity === "warning").length,
    },
    issues,
  };
};
