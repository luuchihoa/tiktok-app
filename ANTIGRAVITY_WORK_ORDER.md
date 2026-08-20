# Work order: Catholic Video Studio hardening and reliability upgrade

## Context and working agreement

This repository is a Remotion-based Catholic-video generator with an Express studio server.
The current worktree intentionally contains uncommitted user changes. Do not reset, discard, or reformat unrelated files. Limit changes to the files named below unless a new file is required for tests or documentation.

Implement the work in the stated order. Do not change the visual design or video timing unless needed to correct a defect.

## P0 — Secure local API execution and file access

**Files:** `server.mjs`, `sub.mjs`, and focused tests if added.

1. Remove shell-string execution of user-controlled audio names.
   - In `server.mjs`, replace `exec()` for subtitle generation with `execFile()` (or `spawn()`) and pass arguments as an array.
   - In `sub.mjs`, replace shell-string `execSync()` calls with `execFileSync()` and explicit argument arrays.
2. Implement one shared server-side filename validator for media and subtitle JSON names.
   - Accept only a basename (no slash, backslash, `..`, or NUL).
   - Restrict media extensions to `.mp3`, `.wav`, `.mp4`, `.mkv`, `.mov`, `.webm`; subtitle files must be the derived `.json` name of an allowed media name.
   - Resolve paths and verify they stay under `public/` or `public/subs/` before every read/write.
   - Return HTTP 400 for invalid input; do not leak stack traces.
3. Harden uploads.
   - Allow only image types needed by the UI (`jpeg`, `png`, `webp`) and the allowed media types.
   - Add a reasonable configurable size limit and reject unsupported/missing MIME types.
   - Keep generated filenames; never preserve user filenames.
4. Validate `POST /api/data` and `POST /api/subtitles` with Zod before writing. Reject malformed subtitle times (negative, non-finite, or non-positive duration).
5. Make CORS local-only by default, documented through an environment variable if cross-origin access is genuinely required.

**Acceptance:** requests containing `../`, a slash, a shell metacharacter, invalid extension, or oversized/unsupported upload return 400/413; valid upload, subtitle generation, subtitle save, and video render still work.

## P1 — Make the application build cleanly and eliminate duplicate/out-of-sync UI behavior

**Files:** `src/CatholicVideo.tsx`, `src/Root.tsx`, `src/WebDashboard.tsx`, `public/studio.html`, `src/data/videoInput.ts`.

1. Make `npm run lint` pass with no ESLint errors and no TypeScript errors.
   - Replace all explicit `any` values with a precise composition-props type.
   - Remove the unnecessary `from={0}`.
2. Pick and document one canonical studio UI. The recommended path is `public/studio.html`, as it owns upload, persistence, subtitles, rendering, backup, and restore today.
   - Either remove `WebDashboard` from the usable product path, or complete it to the same API contract. Do not leave two conflicting studios presented as supported.
3. In `public/studio.html`, stop injecting subtitle text into `innerHTML`.
   - Build the editable fields with DOM APIs and assign text via `.value` / `.textContent`.
   - Preserve the existing editor controls and highlight syntax.
4. Debounce text persistence and show save/error status; prevent concurrent render/subtitle jobs from being started repeatedly.

**Acceptance:** `npm run lint` exits 0. A subtitle containing `<img src=x onerror=alert(1)>` is displayed as text and cannot execute. Editing normal content, save, preview refresh, export, and restore continue to work.

## P2 — Production reliability and maintainability

**Files:** new small test files, `.gitignore`, `README.md`, only as needed.

1. Add automated coverage for filename/path validation and subtitle validation; choose the lightest test setup compatible with this project.
2. Add `.gitignore` entries for generated `public/output.mp4`, runtime uploads, generated subtitles, Whisper binaries/models, and temporary WAV files. Do not remove the user's existing assets.
3. Replace the starter README with concise Vietnamese operating instructions: install, start the studio, upload/create subtitles/render, where output is stored, configuration, and local-only security assumptions.
4. Ensure video duration covers intro + main audio + outro without cutting the outro; add a focused metadata/unit test or an explicit calculation with a clear comment.

**Acceptance:** tests pass, generated artifacts are not staged accidentally, and a new developer can start the studio from the README alone.

## Required delivery report

Return:

1. Files changed and a one-line reason for each.
2. Exact commands run and their results.
3. Any deferred issue, with risk and recommended next step.
4. A compact manual QA script covering upload, subtitles, restore/export, preview, and render.

Do not commit or push. The manager will review the diff and perform final acceptance.
