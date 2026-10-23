# 01: Baseline build gate

**What to build:** A build-verify step that runs the existing Tweego build and asserts the
external invariants of the compiled story that hold today: the build succeeds, the compiled
story has exactly one `#passages`, no `#story` element is authored, and the checkerboard
stylesheet + background script are bundled. This is throwaway scaffolding: it guards tickets
02–03 (the fatal double-`#story` error is the risk during shell work) and is removed in
ticket 04 — from then on the story is tested manually against the build step.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] A single command runs the existing Tweego build and fails when the build fails
- [x] Asserts the compiled story contains exactly one `#passages`
- [x] Asserts no authored `#story` element
- [x] Asserts the checkerboard stylesheet and background script are bundled in the compiled story
- [x] Runs green against the current story, before any shell work begins

## Comments

- 2026-07-18 — Implemented as `scripts/build-verify.sh` (single command: `./scripts/build-verify.sh`).
  Runs the Tweego invocation from `.vscode/tasks.json` verbatim (`-f sugarcube-2 -m src/css -m src/js -o dist/story.html src/story.twee`, `TWEEGO_PATH=.storyformats`), then asserts: build success; exactly one `<div id="passages">` in the compiled story (the one SugarCube appends at runtime); no authored `#story` **or** `#passages` in the `<tw-storydata>` block; `style-module-checker` + `script-module-checker_bg` bundled.
  Note: Tweego HTML-escapes passage content (an authored `<div id="story">` compiles to `&lt;div id=&quot;story&quot;`), so the authored-content checks unescape the `<tw-storydata>` block first — a raw-literal grep misses authored duplicates.
  Negative-verified: broken StoryData JSON → build-failure exit 1; authored `#story` and authored `#passages` in a StoryInterface → caught (Tweego itself compiles both without error, so this gate is what catches them); checker.css/checker-bg.js removed → both missing-module checks fire.
  Reminder for ticket 04: delete `scripts/build-verify.sh`.
- 2026-07-18 — Two-axis code review (Standards + Spec, parallel sub-agents): no hard
  findings. Spec axis: all five boxes met; build invocation byte-for-byte matches the
  VS Code task; removable in one step; "no authored `#passages`" judged defensible
  gap-filler (it is what makes the "exactly one `#passages`" invariant real, since
  authored duplicates compile escaped). Standards axis (judgement calls only, no
  documented standards in repo): applied `tr -d '[:space:]'` and an honest label/comment
  on the `#passages` count check (it asserts SugarCube's runtime element is intact; the
  authored scan enforces the rest of "exactly one"). Skipped: helper extraction for the
  two authored-checks (throwaway script), numeric-entity unescaping (needle set only
  needs `&quot;`). Re-verified green + red after the edits.
