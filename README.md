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
- `run: build + open` — build, then open the story.

By hand:

```sh
TWEEGO_PATH=.storyformats tweego -f sugarcube-2 -m src/css -m src/js -o dist/story.html src
```

## Source layout

| Path                     | Purpose                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/story.twee`         | Story data, `StoryInit`, the content macros, and the passages.                                                                                          |
| `src/shell.twee`         | `StoryInterface`: the one `#passages` container, the background layer, the rail, and the stage's three slots.                                           |
| `src/title.twee`         | Title screen.                                                                                                                                           |
| `src/css/`               | `checker.css` (background + per-level background values), `shell.css`, `stage.css` (per-level slot geometry).                                           |
| `src/js/`                | Story JavaScript, merged in lexical order: `boot.js` (the passage lifecycle, must stay first), `pressure-level.js`, `shell.js`, `stage.js` (the slots). |
| `story.twee-config.yaml` | Macro descriptions for the editor.                                                                                                                      |

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

4. Outline the still-empty slots:

   ```js
   document.body.setAttribute("data-stage-debug", "");
   ```

## Authoring

A `[checker]` passage's exits belong in `<<player_line>>` (or `<<cam_line>>`),
never as a bare `[[…]]` link in passage text: stage mode hides `#passages`, so
a bare link is invisible to the player.
