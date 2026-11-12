# Cam Safety

A SugarCube 2 story. Pressure (0-3) selects one of four visual-novel stage
layouts, and Cam's portrait, speech-bubble and reply bar re-flow around it.

## Prerequisites

- **Tweego** on `PATH` — builds the story.
- **SugarCube 2 story format** in `.storyformats/` — a build dependency, not
  source. Tweego finds it through `TWEEGO_PATH`.

## Build

`.vscode/tasks.json` is the ledger:

- `tweego: build` — one-shot build into `dist/story.html`.
- `tweego: watch` — rebuild on change.
- `assets: copy` — copies `include/images/` to `dist/images/`. The story
  references Cam's portraits as relative `images/cam/...` URLs, so the artwork
  has to sit beside `dist/story.html`. Both build tasks depend on it.
- `run: build + open` — build, then open the story.

By hand (both steps — the portraits are relative URLs):

```sh
mkdir -p dist/images && cp -R include/images/. dist/images/
TWEEGO_PATH=.storyformats tweego -f sugarcube-2 -o dist/story.html src
```

Tweego compiles every `.twee` file under `src/` as a passage, every `.js` into
the story's script section, and every `.css` into its stylesheet — so `src/`
alone is the whole build. Do not also pass `src/js` or `src/css` with `-m`: a
module is compiled a second time (into `<head>`), and because those files are
already sources, the story would carry two copies of each — double the script
payload, two AudioContexts, every handler running twice. That is what the build
used to do, and why `story.html` was 232 KB larger than it needed to be.

## Source layout

| Path                     | Purpose                                                                                                                                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/story.twee`         | Story data, `StoryInit`, the content macros, and the passages.                                                                                                                                                                                                 |
| `src/shell.twee`         | `StoryInterface`: the one `#passages` container, the background layer, the rail, and the stage's three slots.                                                                                                                                                  |
| `src/title.twee`         | Title screen.                                                                                                                                                                                                                                                  |
| `src/css/`               | `checker.css` (background + per-level background values), `shell.css`, `stage.css` (per-level slot geometry and the shared nine-patch frame and speech-paper tokens).                                                                                                                                                  |
| `src/js/`                | Story JavaScript, merged in lexical order: `boot.js` (the passage lifecycle, must stay first), `pressure-level.js`, `reveal.js` (Cam's line, a character at a time), `settings.js` (the two Settings-dialog ranges, read by `reveal.js` and `voice.js`), `shell.js`, `stage-mode.js` (the display mode, derived from the passage tags), `stage.js` (the slots, and the per-level neutral portrait), `voice-letters.js` (the generated letter library), `voice.js` (a letter per character). |
| `include/images/`        | Source artwork: Cam's per-phase GIFs, `cam/phase-N/neutral/` and `cam/phase-N/talking/`, plus the dialogue frame, speech and tail art in `dialogue/`. Copied to `dist/images/` by the build, never read from `src/`.                                                                                                        |
| `story.twee-config.yaml` | Macro descriptions for the editor.                                                                                                                                                                                                                             |

## Verification

There is no test runner, headless DOM, or browser automation; verification is
manual, by design.

1. Build and open the story.
2. Click through Title → Level 0
3. Open scratch passages from the browser console:

   ```js
   SugarCube.Engine.play("Levels");
   SugarCube.Engine.play("Stage content");
   SugarCube.Engine.play("Stage content empty");
   ```

   Each level must show its own phase's neutral pose (phase-0 … phase-3) in
   that level's slot position, and the slot geometry must not change when the
   artwork does.

4. Outline the still-empty slots:

   ```js
   document.body.setAttribute("data-stage-debug", "");
   ```

## Authoring

A `[checker]` passage's exits belong in `<<player_line>>` (or `<<cam_line>>`),
never as a bare `[[…]]` link in passage text: stage mode hides `#passages`, so
a bare link is invisible to the player.
