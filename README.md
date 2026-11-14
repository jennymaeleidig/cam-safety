# Cam Safety

A SugarCube 2 story. A layout (0-3) selects one of four fixed visual-novel
stage compositions, and Cam's portrait, speech-bubble and reply bar re-flow
around it. A passage chooses its layout directly with `<<set_layout>>`.

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

## Language servers

`npm install` also provides the language servers pi-lens runs over `src/`:
`typescript-language-server` (using the project's TypeScript), and the VS Code
CSS, JSON, HTML and YAML servers. `jsconfig.json` puts the story scripts in one
TypeScript project, and `types/story-globals.d.ts` names the globals they share
at load. Twee has no language server, so pi-lens leaves `.twee` files unchecked;
`story.twee-config.yaml` only describes the macros to the editor. The build
still needs nothing but Tweego.

## Source layout

| Path                     | Purpose                                                                                                                                                                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/story.twee`         | Story data, `StoryInit`, the content macros, and the passages.                                                                                                                                                                                                 |
| `src/shell.twee`         | `StoryInterface`: the one `#passages` container, the background layer, the rail, and the stage's three slots.                                                                                                                                                  |
| `src/title.twee`         | Title screen.                                                                                                                                                                                                                                                  |
| `src/css/`               | `measure.css` (the Design canvas, stage window, Design pixel and rail measurements), `frame.css` (the Pixel frame: one nine-patch protocol and its art tokens), `checker.css` (background + per-layout background values), `shell.css`, `stage.css` (per-layout slot geometry and which frame art each slot uses).                 |
| `src/js/`                | Story JavaScript, merged in lexical order: `boot.js` (the passage lifecycle, must stay first), `layout.js` (the running layout and its published `data-layout`), `menu-advance.js` (the Menu's measured character advance), `reveal.js` (Cam's line, a character at a time), `settings-defaults.js` (the tuned defaults and their converted fallbacks), `settings.js` (the two Settings-dialog ranges, their semantic reads and their fallback rule), `shell.js` (rail actions), `stage-mode.js` (the display mode, derived from the passage tags), `stage.js` (the Slots, their content and visible state, and the per-layout neutral portrait), `voice-letters.js` (the generated letter library), `voice.js` (a letter per character). |
| `include/images/`        | Source artwork: Cam's per-phase GIFs, `cam/phase-N/neutral/` and `cam/phase-N/talking/`, plus the dialogue frame, speech and tail art in `dialogue/`. Copied to `dist/images/` by the build, never read from `src/`.                                                                                                        |
| `story.twee-config.yaml` | Macro descriptions for the editor.                                                                                                                                                                                                                             |

## Verification

There is no test runner, headless DOM, or browser automation; verification is
manual, by design. Open the built story and drive it from the browser console:

```js
SugarCube.Engine.play("Layouts");
SugarCube.Engine.play("Stage content");
SugarCube.Engine.play("Stage content long");
SugarCube.Engine.play("Stage content empty");
```

1. **Title and layouts.** Title → Layout 0, and
   `document.body.dataset.layout` is `"0"`. Enter Layouts 0–3: each layout
   shows its own phase's neutral pose (phase-0 … phase-3) in that layout's slot
   position, the geometry matches the present composition, and the artwork
   changing does not move the boxes. The attribute names the layout just
   entered. Menu visible at 0–2, hidden at 3. Each layout passage's first
   macro is `<<set_layout>>`: its first visible frame is that layout, with no
   previous composition flashing first — the attribute write is synchronous,
   not deferred to a later frame. With no `$layout`, or a non-numeric
   one, the stage composes as Layout 0; a finite out-of-range value is clamped.
2. **Bubble.** Play `Stage content long` and scroll the bubble: only the prose
   moves, the paper's edge stays put, no line lands on the outline, the paper's
   translucency and shadow do not fade the ink, and the link inside Cam's line
   is still clickable after the line lands. Paper never swallows a click
   beneath it. Play `Stage content empty`: no orphan paper is drawn.
3. **Settings.** Open Settings from the menu: one Cam header, two ranges,
   labels Text speed and Letter volume, defaults 62.5 and 25. Change Text
   speed — the current line keeps its pace, the next uses the new one. Drag
   Letter volume — the next letter is audible at once. Reload: saved values
   restore. Corrupt or remove a value (console/local storage) and reload: the
   tuned default returns. Set volume to zero: the line still reveals in
   silence. Emulate reduced motion: both ranges are present and the line
   arrives whole.
4. **Slot state.** During a reveal on `Stage content`, inspect the bubble and
   reply: the reply is `data-state="empty"`, `is-revealing` and `inert` until
   Cam lands, then filled and reachable. Space, enter, escape and a pointer
   press land both lines; tab and the arrow keys do not. `Stage content empty`
   leaves no stale state, paper, inertness or held reply. Under reduced motion
   there is no hold and no `inert`. Turn on the debug outline and confirm empty
   slots are outlined and a revealing slot is exempt:

   ```js
   document.body.setAttribute("data-stage-debug", "");
   ```

## Authoring

A `[checker]` passage's exits belong in `<<player_line>>` (or `<<cam_line>>`),
never as a bare `[[…]]` link in passage text: stage mode hides `#passages`, so
a bare link is invisible to the player.
