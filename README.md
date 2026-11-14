# Cam Safety

A SugarCube 2 story. A layout (0-4) selects one of five fixed visual-novel
stage compositions, and Cam's portrait, speech-bubble and reply bar re-flow
around it. A passage chooses its layout directly with `<<set_layout>>`.

Layout 4 is the System layout: Layout 0 without Cam or his bubble, holding the
title screen's reading card. A pre-game system message is written into that
card with `<<system_line>>`.

## Prerequisites

- **Tweego** on `PATH` — builds the story.
- **SugarCube 2 story format** in `.storyformats/` — a build dependency, not
  source. Tweego finds it through `TWEEGO_PATH`.

## Build

`.vscode/tasks.json` is the ledger:

- `tweego: build` — one-shot build into `dist/story.html`.
- `tweego: watch` — rebuild on change.
- `assets: copy` — copies `include/images/`, `include/fonts/` and
  `include/music/` to `dist/`. The story references Cam's portraits as relative
  `images/cam/...` URLs and the track as a relative `music/...` URL, so the
  assets have to sit beside `dist/story.html`. Both build tasks depend on it.
- `run: build + open` — build, then open the story.

By hand (the assets, then the build — the portraits and the track are relative
URLs):

```sh
mkdir -p dist/images dist/fonts dist/music
cp -R include/images/. dist/images/
cp -R include/fonts/. dist/fonts/
cp -R include/music/. dist/music/
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
| `src/shell.twee`         | `StoryInterface`: the one `#passages` container, the background layer, the rail, and the stage's four slots.                                                                                                                                                    |
| `src/title.twee`         | Title screen.                                                                                                                                                                                                                                                  |
| `src/css/`               | `measure.css` (the Design canvas, stage window, Design pixel and rail measurements), `frame.css` (the Pixel frame: one nine-patch protocol and its art tokens), `checker.css` (background + per-layout background values), `shell.css` (the shell, the rail, and the reading card shared by the title and the system card), `stage.css` (per-layout slot geometry, the per-pose portrait nudges, and which frame art each slot uses).                 |
| `src/js/`                | Story JavaScript, merged in lexical order: `boot.js` (the passage lifecycle, must stay first), `layout.js` (the running layout and its published `data-layout`), `menu-advance.js` (the Menu's measured character advance), `music.js` (the pair of looping background elements, the crossfade between tracks, and the autoplay gesture), `reveal.js` (Cam's line, a character at a time, and the reduced-motion beat), `settings-defaults.js` (the tuned defaults and their converted fallbacks), `settings.js` (the Settings dialog's three ranges and mute toggle, their semantic reads and their fallback rule), `shell.js` (rail actions), `stage-mode.js` (the display mode, derived from the passage tags), `stage.js` (the Slots, their content and visible state, the per-layout neutral and talking poses, and the pose transition), `voice-letters.js` (the generated letter library), `voice.js` (a letter per character). |
| `include/images/`        | Source artwork: Cam's per-phase GIFs, `cam/phase-N/neutral/` and `cam/phase-N/talking/`, plus the dialogue frame, speech and tail art in `dialogue/`. Copied to `dist/images/` by the build, never read from `src/`.                                                                                                        |
| `include/music/`         | The background tracks — the Jamil theme and its distorted arrangement for Layout 3 — copied to `dist/music/` by the build and played from relative URLs.                                                                                                           |
| `story.twee-config.yaml` | Macro descriptions for the editor.                                                                                                                                                                                                                             |

## Verification

There is no test runner, headless DOM, or browser automation; verification is
manual, by design. Open the built story and drive it from the browser console:

```js
SugarCube.Engine.play("Layouts");
SugarCube.Engine.play("Stage content");
SugarCube.Engine.play("Stage content long");
SugarCube.Engine.play("Stage content empty");
SugarCube.Engine.play("System content");
SugarCube.Engine.play("System content long");
SugarCube.Engine.play("System content empty");
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
2. **Cam's poses.** On each layout, watch the portrait while a Cam line is
   revealed: it switches from that phase's neutral pose to its talking pose on
   the first revealed character and back when the line lands, and the Pixel
   frame and slot boxes do not move. Skip mid-line: the pose lands with the
   text. On phase 2, the neutral body and hand still land together, and the
   talking pose clears the hand layer. A passage that authors `<<portrait>>`
   keeps that one image for the whole passage. Check the cam slot advertises
   its pose:

   ```js
   document.querySelector('.stage-cam').dataset.pose; // "neutral" or "talking"
   ```

   To tune a pose, drag its nudge in devtools and watch the built story: the
   values live in `stage.css` as per-phase, per-pose art pixels. Check each
   phase's two poses at Layouts 0–3 — especially the close-in scale at
   Layout 3 — until the character lands on the same spot in both.
3. **Bubble.** Play `Stage content long` and scroll the bubble: only the prose
   moves, the paper's edge stays put, no line lands on the outline, the paper's
   translucency and shadow do not fade the ink, and the link inside Cam's line
   is still clickable after the line lands. Paper never swallows a click
   beneath it. Play `Stage content empty`: no orphan paper is drawn.
4. **Settings.** Open Settings from the menu: a Cam header with two ranges,
   labels Text speed and Letter volume, defaults 50 and 25; and a Music header
   with Music volume (default 40) and a Mute music toggle (off). Change Text
   speed — the current line keeps its pace, the next uses the new one. Drag
   Letter volume — the next letter is audible at once. Reload: saved values
   restore. Corrupt or remove a value (console/local storage) and reload: the
   tuned default returns. Set volume to zero: the line still reveals in
   silence. Emulate reduced motion: all three ranges are present, Cam's line
   arrives whole, and the music keeps playing.
5. **Slot state.** During a reveal on `Stage content`, inspect the bubble and
   reply: the reply's text is empty and it is `is-revealing` and `inert` until
   Cam lands; its `data-state` stays `filled` so its paper is up, then it lands
   filled and reachable. Space, enter, escape and a pointer press land both
   lines; tab and the arrow keys do not. `Stage content empty` leaves no stale
   state, paper, inertness or held reply. Under reduced motion
   the talking pose holds for one beat and the reply is held empty and inert
   for that beat, then lands; space, enter, escape or a pointer press ends the
   beat at once. A passage with no Cam line, or a refresh-restored line with
   no gesture, shows no talking beat.
   Turn on the debug outline and confirm empty slots are outlined and a
   revealing slot is exempt:

   ```js
   document.body.setAttribute("data-stage-debug", "");
   ```
6. **Music.** Start the story and enter Layouts 0–3. The title track begins,
   and `document.body.dataset.track` is `"theme"`. Moving between the title and
   Layouts 0–2 never restarts it: the playing element's `currentTime` keeps
   advancing and its `paused` stays `false`. Let it reach the end and it loops.
   Enter Layout 3: `data-track` becomes `"distorted"` on that same passage,
   the distorted arrangement fades in while the theme fades out over about a
   second, and a fresh visit to Layout 3 after leaving starts the crossfade
   again. The switch belongs to the passage that publishes the layout: no
   passage plays the previous layout's track. Leaving
   Layout 3 back to a theme layout crossfades back, and a same-track move
   between Layouts 0–2 is unchanged. Open Settings, Saves and the menu:
   playback survives. Drag Music volume and hear it at once, including
   mid-crossfade; mute pauses both elements where they are and unmuting
   continues from there. Reload and confirm the volume and mute state restore.
   Check the letter sounds and the music never change each other's loudness.
   Emulate reduced motion: music still plays, crossfade included. Enter
   Layout 4: `data-track` stays `"theme"` because the System layout carries
   Layout 0's track, and the music keeps playing without a restart.

   ```js
   document.body.dataset.track; // "theme", then "distorted" in Layout 3
   Array.from(document.querySelectorAll("#music, #music-b")).map((el) => ({
     src: el.getAttribute("src"),
     level: el.volume,
     paused: el.paused,
   }));
   ```
7. **System layout.** Play `System content`. `document.body.dataset.layout` is
   `"4"` on the first visible frame, and the card sits exactly where Layout 0's
   speech bubble sits; the reply bar is in Layout 0's place, the menu is
   visible, and the background hue matches Layout 0. No portrait, no hand layer
   and no speech paper or pointer are drawn. The system message is whole at
   once — no reveal, no letter voice — and its link is clickable immediately;
   the reply carries the way on. `System content long` scrolls inside the card
   while the frame stays put. `System content empty` draws no card at all and
   nothing survives from the previous passage. With reduced motion the card
   still arrives whole; there is no motion preference of its own. Save on
   `System content`, reload and continue: Layout 4 and the card come back.
   Confirm the shared card and the slots:

   ```js
   document.querySelector(".stage-system").dataset.state; // "filled"
   document.querySelector(".stage-system .reading-card-prose"); // the card's box
   document.querySelector(".stage-cam").dataset.state; // "empty" on Layout 4
   ```

   Turn on the debug outline on `System content empty`: the system slot is
   outlined as an omitted card, while the hidden cam and bubble are not. The
   title still carries the same card classes and reads unchanged:

   ```js
   document.getElementById("passages").classList.contains("reading-card"); // true
   ```

   Finally, an authoring error: give a Layout 4 passage a `<<cam_line>>` or
   `<<portrait>>`, or a Layouts 0–3 passage a `<<system_line>>`, and confirm
   `#passages` reports it rather than the macro vanishing silently.

## Authoring

A `[checker]` passage's exits belong in `<<player_line>>` (or `<<cam_line>>`),
never as a bare `[[…]]` link in passage text: stage mode hides `#passages`, so
a bare link is invisible to the player.

`<<set_layout>>` takes 0–4 and comes first in the passage; the line macros read
the published layout. On Layout 4 write `<<system_line>>` for a system message
and use `<<player_line>>` for the way on. `<<cam_line>>` and `<<portrait>>`
report an authoring error on Layout 4, and `<<system_line>>` reports one on
Layouts 0–3: each macro refuses on a layout that has no slot for it.
