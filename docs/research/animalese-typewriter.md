# Animalese + a SugarCube typewriter, in this piece

Sources: `acedio/animalese.js@6f18a90` (github.com/Acedio/animalese.js — the
original 2014 implementation and `animalese.wav`), `jeff-hykin/animalese@877a8c4`
(github.com/jeff-hykin/animalese — the "modern tooling" fork the question names),
SugarCube `repo@v2.37.3: <path>` (github.com/tmedwards/sugarcube-2, tag v2.37.3)
plus the official docs `docs #<anchor>` (motoslave.net/sugarcube/2/docs/), and
the Twine Cookbook page `cookbook/typewriter/sugarcube/sugarcube_typewriter.html`
(read from the Wayback snapshot: the live page answers 403 to a non-browser
client, so its text here is the archived copy, whose content matches the
v2.32-era page).

## 1. The question

What would melding [animalese](https://github.com/jeff-hykin/animalese) with
[the cookbook's SugarCube typewriter](https://twinery.org/cookbook/typewriter/sugarcube/sugarcube_typewriter.html)
look like in *this* story — a Tweego-only build, opened over `file://`, whose
visible text is written by `src/js/stage.js` into three slots at
`:passagerender`?

## 2. Verdict

The typewriter half is already in the engine and is a bad fit *as a macro*,
because it is a macro: it renders into `#passages`. The sound half is a
7.7 KB function over a 172 KB recorded sample set, which also does not fit the
way the library is packaged (ESM, one whole-utterance WAV per call, base64 data
URI, `new Audio()` per call).

Melded properly, the two halves split cleanly along the seam this repo already
has. `stage.js` keeps writing the slot in one flush; a new
`src/js/type-out.js` reveals the *already-wikified* DOM a code point at a time
(elements stay attached, text nodes grow), and a new `src/js/voice.js` plays one
0.15 s letter slice per revealed A–Z, from the letter library decoded once into
an `AudioContext`. Authoring does not change: `<<cam_line>>` and
`<<player_line>>` keep taking one wiki-processed string. Cost: about +199 KB of
`story.html` (the sample set, 7-bit packed), ~110 lines of new JS, no build-step
change, no new asset files, and a CC BY 4.0 attribution obligation on the audio.

## 3. Animalese — what it is and what it costs

### 3.1 Packaging

Not an npm package. The repo has four files and **no `package.json`**
(`repo@877a8c4`: `animalese.js`, `animalese.wav.binaryified.js`, `readme.md`,
`license.md`), and the npm registry has no `animalese` package
(`registry.npmjs.org/animalese` → `{"error":"Not found"}`; the `animalese-*`
packages that do exist are unrelated third-party reimplementations). It is
consumed by URL, e.g. `import { animalese, playSound } from
"https://esm.sh/gh/jeff-hykin/animalese@1.0.1.0/animalese.js"`
(`readme.md`), or by copying the two files.

Both files are **ESM** (`export function animalese`, `import letterLibrary from
"./animalese.wav.binaryified.js"`), so a plain `<script>` cannot load them. This
matters concretely here: Tweego emits every `src/js/*.js` as a classic script
(`dist/story.html:1244` → `<script id="script-module-boot"
type="text/javascript">`), so `import`/`export` in `src/js/` is a syntax error: a
vendored copy must be closed over an IIFE.

### 3.2 API and output

Two functions (`repo@877a8c4: animalese.js`):

- `animalese(script, shorten = false, pitch = 1)` → a `RIFFWAVE` object; read
  `.dataURI` for `"data:audio/wav;base64,…"`. Synchronous, and Node-safe.
- `playSound(text, { shorten, pitch })` → `new Audio(); audio.src = …dataURI;
  return audio.play()`. **Browser only**; one fresh `Audio` element and one
  fresh WAV encode per call, no shared context, no handle to stop or overlap.

There is no voice parameter. `pitch` (0–2) and `shorten` are the whole option
set; "Animal-Crossing-style voice selection" is not in this library — a second
voice has to be faked with a second pitch (see §5.4).

`pitch` is not a resampler: each output sample is
`letterLibrary[44 + letterStart + Math.floor(i * pitch)]`, a read *stride* (or
repeat) over the recorded slice (`animalese.js`, `animalese()`). Measured on the
real module: every character costs `0.075 s × 44100 = 3307` samples, hence a
~4.4 KB base64 data URI *per character*; a 178-character line produced 588,646
samples and a 767 KB string in 12 ms here. Pitch 0 is degenerate (one repeated
sample: a DC line) and pitch > 2 reads past the letter into the next — or past
the library end, where it silently yields zeros (`animalese("Z", false, 3)`
returns a data URI of `A`s). **Clamp to ~0.5–2.**

### 3.3 The samples, and the character mapping

The library is recorded, not synthesized: `animalese.wav.binaryified.js` is the
**byte-identical** 172,034-byte `animalese.wav` from the 2014 repo (verified by
importing the module and hashing `default`: SHA-256 `0a3538776352c79e…`,
`identical: true`). It is 8-bit unsigned mono PCM at 44,100 Hz: a 44-byte RIFF
header, then 26 slices of 6,615 samples (0.15 s) each, A–Z, 3.9 s total. The
fork stores it as a 198,459-character template literal of 7-bit values, 8
characters → 7 bytes (`animalese.wav.binaryified.js`, `stringToBytes()`,
`eightToSeven()`), which is why a 172 KB WAV occupies a 201 KB source file.

The mapping (`animalese.js`, the `for` loop) is exactly:

- `'A'`–`'Z'` after `.toUpperCase()` → that letter's slice;
- **everything else** — spaces, `.`, `,`, digits, `é`, emoji — → 3,307 samples
  of `127` (8-bit silence). A space therefore costs 75 ms of silence; an emoji
  is two UTF-16 code units and costs 150 ms;
- `shorten` first reduces `script` to letters (`/[^a-z]/gi`) and each word to
  its first and last letter (`shortenWord()`);
- the upcase is recomputed *inside* the loop (`processed_script.toUpperCase()
  [c_index]`), so a character whose uppercase is longer (`ß` → `SS`) shifts the
  index and drops a character.

### 3.4 Licence, and the caveat that matters

`jeff-hykin/animalese` ships a plain **MIT** `license.md` ("Copyright (c)
2023 Jeff Hykin") covering the repository. It does **not** mention the audio.
The upstream repo does: `acedio/animalese.js@6f18a90: LICENSE.md` (commit
"Clarifying derivative work licensing", 2025-05-20) says the **audio assets
(`animalese.wav`) are licensed under CC BY 4.0**, the code under MIT, and the
README adds "This project is not affiliated with Nintendo Co., Ltd." The fork's
MIT header is therefore incomplete for the samples it embeds: shipping them
needs attribution to Josh Simmons and a CC BY 4.0 notice. They are also
sound-alikes of a Nintendo-adjacent effect — fine for a personal project,
not something to describe as cleared.

## 4. The SugarCube typewriter — what it is and where it hooks

### 4.1 The cookbook page is a pointer, not a technique

The page's entire body is: "SugarCube (versions ≥ 2.32.0) includes a `<<type>>`
macro for creating a typing effect for displayed text. Almost any type of
content can be typed using this macro, including links, styling markup, and
other macros that display text", then a download whose Twee is
`<<type 60ms>>\ Hello world! … <</type>>` with a `<<link "Click here!">>` inside
(`sugarcube_typewriter_twee.txt`). There is **no third-party macro** and no
external library: the page is a one-screen wrapper around an engine feature.

### 4.2 What `<<type>>` actually does (2.37.3)

`repo@v2.37.3: src/macro/macros/type.js`. Introduced in v2.32.0 (docs
`#macros-macro-type` history). Signature: `<<type speed [start delay] [class
classes] [element tag] [id ID] [keep|none] [skipkey key]>>`. `speed` is a CSS
time (20–60 ms suggested) parsed by `cssTimeToMS()`; `start` defaults to 400 ms;
`0s`/`0ms` finishes immediately (2.37.0).

The important part is the order of operations, which is the opposite of
"append characters as you go":

1. `new Wikifier($wrapper, contents, …)` — the whole payload is **wikified
   once**, up front, into a fresh wrapper element. Links are created and bound
   here (`Wikifier.createInternalLink()` → `$link.ariaClick({one:true}, …)`,
   `src/markup/wikifier.js`), and `ariaClick` sets `tabindex=0` by default
   (`src/extensions/jquery/aria-plugin.js`).
2. `new NodeTyper({ targetNode: $wrapper.get(0) })` — the constructor walks the
   tree, **removes every child**, and replays them in document order, one text
   node character at a time, appending elements back as it reaches them
   (`src/lib/nodetyper.js`, `constructor`/`type()`). Surrogate pairs are handled
   by `charAndPosAt()`.
3. Skipping: `keydown` on `document`, only when `ev.target` is `body`/
   `documentElement` and `scrubEventKey(ev.key) === skipKey`; the default skip
   key is **space** (`Config.macros.typeSkipKey = '\x20'`, `src/config.js:29`).
   It calls `typer.finish()`.
4. Cancellation: the interval's callback stops if `State.passage !== passage ||
   State.turns !== turn`, i.e. navigation kills typing.
5. Events: `:typingstart` / `:typingstop` are **local** events on the wrapper
   (they bubble), `:typingcomplete` is global when the queue drains (docs
   `#events-type-macro`). There is **no per-character hook** of any kind, and
   `Config.macros.typeVisitedPassages` defaults to `true` (`src/config.js:30`),
   so revisits type again.

Two consequences. "Types wiki markup" is loose: markup is consumed at
wikification, and what is typed is the *rendered* result, never the source. And
a link is clickable as soon as its `<a>` node is appended, **before its own text
has finished typing** — a half-typed link is a live target.

### 4.3 Text reveal in 2.37.3, and the hooks that exist

- `$(el).wiki(html)` wikifies into a fragment and appends to any target (docs
  `#methods-jquery-prototype-method-wiki`; `src/extensions/jquery/wiki-plugin.js`).
  `Config.cleanupWikifierOutput` is `false` by default (`src/config.js:14`), so
  a one-line `.wiki("text [[link]]")` produces a text node plus an `<a>` and no
  `<p>` wrapper; paragraphs appear only for blank-line-separated input or when
  cleanup is on.
- `:passagerender` fires with `detail.content` = the passage element, while the
  passage is still detached and `#passages` still holds the outgoing passage
  (`src/engine.js`, around the `:passagerender` trigger).
- The `tabindex` sweep over `#story` (`a,link,button,input,select,textarea`)
  runs *after* `:passagerender` and before `:passageend` (`src/engine.js`).
  It is a backstop: wikified links already carry `tabindex=0` from `ariaClick`.
- **There is no speech API in 2.37.3.** `grep -rni speech src/ docs/` returns
  nothing: no `Config.speech`, no `Speech` object. Any speech-like sound is
  story JavaScript's job.
- `NodeTyper` is not exported: `window.SugarCube` is an explicit allowlist
  (`src/sugarcube.js`), so a story may call `SugarCube.Wikifier` but **cannot
  construct a `NodeTyper`** — the class is reachable only from `<<type>>`.

## 5. Melding them into this piece

### 5.1 Where the layer sits

Today: `stage.js` `flush()` → `writeLine(name, html)` → `slot.textContent = ""`
→ `jQuery(slot).wiki(String(html))` → `setState(slot, true)`
(`src/js/stage.js`, `writeLine`). One writer, one flush, at `:passagerender`
(`src/js/boot.js`). That is already the ideal seam, and it stays: `writeLine`
gains a three-line delegation and nothing else about it changes.

```
writeLine(slot, html):
    clear;  if (!html) { empty; return }
    if (Stage.typeLine) Stage.typeLine(slot, String(html))   // new
    else jQuery(slot).wiki(String(html))                     // today
    setState(slot, true)                                     // unchanged
```

`Stage.typeLine` is assigned by `src/js/type-out.js`. Because `flush()` looks
the function up **at call time**, merge order only has to satisfy "after
`boot.js`", which the names do: `boot` < `stage` < `type-out` < `voice`
(lexical, as Tweego merges). `stage.js` never learns what a typer is.

The `data-state` / `data-slot-label` contract is untouched: the typewriter never
reads or writes attributes on the slot; `setState` runs before the first
character, so the bubble's paper (`.stage-bubble[data-state="filled"]`) and the
reply bar's frame are up while the line types — the ordinary VN read.

### 5.2 The reveal: operate on the wikified DOM

`jQuery(slot).wiki(html)` runs first, exactly once. Then a ~40-line walker
(collected in document order: `{node, chars}` for text nodes, plus the
code-point array per node) empties each text node's `nodeValue` and refills it
one code point per tick. **Element nodes are never detached**; only text grows.
That is `NodeTyper` minus its detach/append step, and the difference is
deliberate:

| approach | nested markup | links | layout | cost |
| --- | --- | --- | --- | --- |
| walk the wikified DOM, grow text nodes (recommended) | free — attributes, classes, handlers untouched | `<a>` exists from t=0 but has zero width until its text starts, so it is not clickable while invisible | grows; with `justify-content:center` (`stage.css`, the shared bubble/reply block) the block re-centres **only when it wraps** | ~40 lines, no wrapper |
| pre-wikify and hide per character (spans / `visibility:hidden`) | needs text-node splitting; element boundaries cannot be split | an invisible link **is** clickable — a mis-click hazard in the reply bar | stable from frame 1 | 200 spans per 200-char line; breaks copy/selection |
| pre-wikify and mask/clip | one unwrapped line only | n/a | stable | rejected: `overflow:auto` + wrapping prose |

The walker's honest gap: it has no notion of a non-text leaf's place in time. An
`<img>` or `<br>` in a line appears at once. Lines here are prose plus links
(`src/story.twee`), so this is acceptable — but it is a property to keep in
mind if a bubble ever carries an icon.

"Do not re-type on re-render": key the last write as
`(slot, html, State.moments.length)`; identical html into the same slot in the
same moment returns without typing. `Engine.backward()/forward()` re-render, so
they re-type — consistent with the engine's own behaviour (content macros
re-run) and with `typeVisitedPassages`' default.

### 5.3 Skip, cancel, and the lifecycle

- **Cancel**: `Stage.onPassageStart` → `epoch += 1`, clear the timer, drop the
  queue. This is the same guarantee `<<type>>` gets from its
  `State.passage/turns` check, expressed through this repo's lifecycle instead
  of a second subscription, and it runs before the next flush empties the slot.
- **Skip**: `pointerdown` and `keydown` in the capture phase on `document`.
  A pointer anywhere finishes the current line and **does not**
  `preventDefault()`, so a click on a reply link both finishes the line and
  follows the link (navigation then cancels the rest) — no swallowed clicks, no
  double-fire. Keys: space / enter / escape only, so Tab and typing elsewhere
  do not finish a line.
- **Two lines in one flush**: queue by slot, bubble first, reply when the bubble
  finishes. The sound follows whichever line is typing.
- **Long lines**: cap total typed time (`speed = min(45, 4000 / chars)` ms), and
  type `ceil(elapsed / speed)` characters per tick so a long line cannot drift.

### 5.4 The sound driver

Do **not** call `playSound()`. Build the 26 slices once into an `AudioContext`
and play one per revealed letter:

```
unlock (first pointerdown/keydown, capture, once):
    ctx = new AudioContext()
    bytes = unpack(letterLibrary7bit)          // 172,034-byte WAV, at load
    ctx.decodeAudioData(bytes.buffer).then(b => buffer = b, () => voiceDead = true)
    ctx.resume()

onLetter(ch):                                   // A-Z only; everything else silent
    if (!buffer || ctx.state !== "running") return
    if (now - last < 55ms) return               // faster typing -> fewer sounds
    src = ctx.createBufferSource()
    src.buffer = buffer; src.playbackRate.value = pitch   // 0.5..2
    src.start(ctx.currentTime, letterIndex * 0.15, 0.075 * pitch)
    last = now
```

The offset/duration pair reproduces the upstream stride exactly: upstream reads
`library[floor(i * pitch)]` for `i < 3307`, i.e. at pitch 1 it plays the first
0.075 s of the letter at original rate, and at pitch 2 the whole 0.15 s in
0.075 s — which is `playbackRate = pitch`, `duration = 0.075 × pitch` in buffer
time. Two speaks can then share one library at two pitches (Cam 1.0, reply 1.15
— a starting suggestion, not a measurement), which is the only "voice
selection" this library admits.

Why the packed library in `src/js/` and not files in `include/`: `file://` is
this project's verification path (README, Verification), the story is opened
with no server, and `fetch`/XHR of a local file is blocked there. Media
elements (`<audio src>`, like the existing `images/cam/…` GIFs) do work, but a
per-character `<audio>` is 26 elements and an iOS seek-per-play problem, and
`decodeAudioData` needs bytes, not a media element. So:

| route | verdict |
| --- | --- |
| 7-bit-packed library as a vendored `src/js/voice.js` (recommended) | +199 KB in `story.html` (748 KB → ~950 KB), one file, no copy task, `file://`-safe, decoded once after a gesture |
| 26 WAVs in `include/audio/`, copied to `dist/audio/` | +26 files, +~180 KB, needs a new copy task and a path convention; `<audio>` only, so no `decodeAudioData` without a server |
| generate WAV per utterance with `animalese()` + `data:` URI | works, but a 767 KB string and 12 ms *per line* (measured), one `Audio` element per line — the thing this design avoids |

The load-time cost of the packed literal is a 198 KB string parse; the unpack
is a 198 k-iteration loop (~1–2 ms), deferrable to the unlock handler.

### 5.5 Failure and fallback

- **Reduced motion**: `matchMedia("(prefers-reduced-motion: reduce)")` →
  `Stage.typeLine` writes the line whole, no sound. `checker.css` already
  honours the same query for the background (`src/css/checker.css:165`), so this
  is one policy, not two.
- **No audio / decode failure / blocked context**: `voiceDead` and the typewriter
  carries on silently. Typing never depends on sound.
- **No user gesture**: the title click is the gesture, but README's console
  verification (`SugarCube.Engine.play("Stage content")`) has none — those lines
  type silently. Expected, worth a README line.
- **Two lines in one passage / very long line**: §5.3.
- **Navigation mid-line**: the start-phase cancel runs before the next flush
  clears the slot, so no timer can write into a re-used slot. A failed decode
  is silently silent for that page load.

### 5.6 Files, and what does not change

| file | change |
| --- | --- |
| `src/js/stage.js` | +3 lines in `writeLine` (delegate to `Stage.typeLine`) |
| `src/js/type-out.js` (new, ~90 lines) | walker, queue, skip, cancel, reduced-motion, `Stage.typeLine` |
| `src/js/voice.js` (new, ~30 lines + 199 KB library) | unpack, context, decode, per-letter play, unlock, `Stage.voice` |
| `src/css/stage.css` | none required (optional: a `[data-typing]` rule if the re-centre jump on wrap needs suppressing) |
| `src/story.twee`, `story.twee-config.yaml` | **unchanged** — `<<cam_line "…">>` / `<<player_line "…">>` keep taking one quoted, wiki-processed string |
| `README.md` | a Verification line (sound needs a real gesture) and a credits line |

A new macro is the wrong seam: a macro renders into `#passages`, which stage
mode hides, and the content macros are already deliberately side-effect-only
(`src/story.twee`, the `StoryInit` comment).

### 5.7 If you would rather write ten lines than a hundred

A cheaper variant: `jQuery(slot).wiki("<<type 40ms>>" + html + "<</type>>")`.
It buys the queue, the skip key and cancel-on-navigation for free, and wikifies
once, so links stay single-bound. Its costs are concrete:

1. it adds a `div.macro-type` (plus `macro-type-cursor`) inside the flex-column
   slot — a new box for `stage.css`'s `.stage-bubble p` rules to sit beside;
2. at `:passagerender` the state is `States.Rendering` (`src/engine.js`) and
   `Engine.isPlaying()` is `_state !== States.Idle` (`engineIsPlaying()`), so
   `<<type>>` **defers to `:passageend`** — after the `tabindex` sweep, a task
   later than today's flush;
3. no per-character hook, so the sound layer needs a `MutationObserver` on the
   slot — more machinery than the walker it replaces;
4. its skip key (space on `body`) would coexist with ours and disagree, and
   `typeVisitedPassages` would need `Config` changes.

Use it only if the sound layer is dropped.

## 6. Risks, licences, open questions

1. **Licence (blocking for a public release).** Ship Josh Simmons' attribution
   and a CC BY 4.0 notice for the audio where the player can see it; the fork's
   MIT file does not cover it. Do not describe the samples as cleared.
2. **Size.** `story.html` +199 KB, parsed on every load, on a 748 KB story.
   Acceptable; state it in the PR.
3. **Layout while typing.** The reading block is `display:flex;
   justify-content:center; overflow:auto` in a fixed per-level box
   (`src/css/stage.css`), so text jumps half a line per *wrap*, not per
   character. If that reads badly, a `.is-typing` class pinning
   `justify-content:flex-start` trades several jumps during for one at the end.
   **Not measured**; needs eyes on the built story at all four levels.
4. **Accessibility.** No `aria-live` on the slots (`src/shell.twee`), so typing
   is not announced per character — good — but the reply bar's links are
   reachable before their text is painted. Consider finishing a line on focus.
5. **Not verified:** anything requiring a browser — autoplay, iOS Safari
   (`AudioContext` after a gesture, many short `BufferSource`s),
   first-utterance latency, the re-centre jump, phone-side unpack cost. All
   reasoned from source, not measured. The cookbook page was read from the
   Wayback snapshot because the live site returns 403.
6. **Open questions.** Pitches for Cam vs. the reply bar; whether the bubble
   should type slower than the reply; sound in shell mode (out of scope: no
   slot, no typer); a `[quiet]` passage tag.

## 7. The prototype: what was measured

A throwaway prototype was built to answer §6.3 and §6.5 by running, not by
reading: `prototype/` (gitignored, and deleted once the feature shipped —
everything below survives it). It built the
real story plus its own two `[checker scratch]` passages into
`prototype/dist/story.html` (`sh prototype/run.sh`) and was driven by a panel
of knobs. `prototype/README.md` was its record; this section is the
conclusions.

**The reveal works as designed.** Text nodes of the already-wikified slot grow
in place; `<a>` elements stay bound and become clickable once they have width.
Verified in headless Chrome (`Typewriter.Proto` counters + DOM probes), not
inferred.

**Findings that change the recommendation above:**

1. **The seam moves into `stage.js`, and not for tidiness.** A second
   `Stage.onPassageRender` subscriber is *not* reliably after `stage.js`'s
   flush, because story JavaScript runs twice per load — once from the
   `<head>` module scripts Tweego emits (in `-m` order), once from the
   `twine-user-script` block SugarCube evaluates at init (ordered by path).
   With the prototype in `prototype/`, that second copy registers *before*
   `stage.js`, so at hook time the slots are still `data-state="empty"`.
   The shippable version must be called from inside `writeLine()` in
   `src/js/stage.js`, which already has the finished slot; the prototype
   instead defers one microtask after `:passagerender`, which is a workaround,
   not a design.
2. **The layout jump is real and measurable.** At 1440×900, level 0, a
   151-character line at 28 ms/char moves the first line **34 px upward**
   (335 px → 301 px) when the third line wraps, because the bubble is a
   centred flex column. The `.is-typing { justify-content: flex-start }`
   fallback in §6.3 is therefore worth having; whether the jump *reads* badly
   is still a person's call.
3. **Sequential, with the queued slot's paper hidden.** Typing bubble and
   reply together reads as two speakers at once. Sequential leaves the second
   slot visibly empty (a white card, a green bar) for the length of the first
   line, which looks broken; hiding the queued slot's `data-state` until its
   turn fixes it. Note this means the *flush* should not publish "filled"
   before the line is typed — a contract change in `stage.js`, not a CSS one.
4. **`<<type>>` is ruled out, confirmed.** Its `NodeTyper` defers to
   `:passageend`, which has already fired when `stage.js` writes a slot; the
   macro renders an empty `div.macro-type` into the slot. §4's rejection now
   has a measured cause.
5. **Size, measured.** The base64 PCM blob costs **+248 KB** on a 750 KB
   `story.html` (229 KB of base64 + 19 KB of driver), versus the +199 KB
   estimated in §5 for the 7-bit-packed library. Shipping should use the
   packed form and unpack at runtime, or pre-generate per-letter clips.

**Also found, unrelated to this work:** `src/js/stage-mode.js` throws
`TypeError: Cannot read properties of null (reading 'classList')` on every
load, in the unmodified story — story JavaScript ran before `<body>` existed,
so its load-time `applyModeFromBody()` never ran. And every story script
executed twice (see 1), giving the story two `Stage` registries and two
flushes per passage. Both had one cause: the `-m` duplication. With `src/`
compiled alone there is one evaluation, in `twine-user-script`, after the body
exists and before `Setting.init()` — so the load-time call runs, and the guards
that two copies had required are gone (see the addendum).

**Addendum: the crackle.** The prototype's first cut clicked on every letter.
Two causes, both in the audio path rather than the reveal: each 0.15 s library
slice is cut mid-waveform and was played at full amplitude (a step edge per
character), and a 75 ms slice every 4–120 ms means two or three voices sum
past 1.0 and clip. Measured offline (`OfflineAudioContext`, 58 letters at
28 ms, pitch 1): peak **1.258** and a **0.298** sample step with no treatment;
**0.860** peak and **0.211** with a 4 ms linear fade per source plus a
`DynamicsCompressorNode` (threshold −10, ratio 6) on the sum, and no steps
over 0.25. A fade alone removes the clicks; the compressor is what keeps the
overlap from clipping, and it does not cost level. The bench that produced
these numbers went with the prototype; the shipped path is
`src/js/voice.js`, and its constants are the tuning above.

**Addendum: what shipped.** The story now reveals Cam's line and keeps the
reply whole (`docs/adr/0002-cam-speaks-aloud.md`). Final numbers, tuned by ear
on the built story: **16 ms/char, pitch 0.8, volume 0.25, 10.5 ms fade**, one
compressor on the summed letters, links revealed whole and silent, and silent
without a gesture until the first click. Two figures from the shipping build,
both measured in headless Chrome rather than reasoned about: a link inside the
bubble arrives as 0 → 12 characters in one frame and stays inert until the line
finishes; and the library trims from 0.15 s to the 0.075 s per letter that
animalese ever plays, halving the payload to 86 KB of 8-bit PCM.

That payload was then paid for twice, because the build passed `src/js` to
Tweego with `-m` *and* compiled `src/` as its sources: a module is compiled a
second time into `<head>`. Building `src/` alone compiles each `.js` and `.css`
file once, into the story's own script and style sections — 232 KB of payload
and a second evaluation of every script removed, with nothing else about the
story changed. The two guards that duplication had forced (`reveal.js`,
`voice.js`) went with it. The findings above are what was true when they were
measured; this is what shipped.

The prototype this file measured (a panel with every knob on it) has been
deleted; `docs/adr/0002-cam-speaks-aloud.md` holds the decision and its
consequences, and `src/js/reveal.js` / `src/js/voice.js` / `src/js/voice-letters.js`
hold the code. The names in §5 below are the plan's names: `type-out.js` became
`reveal.js` and `Stage.typeLine` became `Reveal.start(slots)`, because the
flush already knows which slots it filled and the glossary calls the effect a
reveal, not a typewriter.

One measurement belongs here rather than in the ADR: at the shipped settings
(48 letters, 16 ms apart, pitch 0.8) the untreated signal peaks at **1.31**
with **7** sample steps over 0.25, and the shipped envelope + compressor +
volume peaks at **0.23** with **no** step over 0.25. The earlier figures in
this section (1.258 / 0.298) were taken at 28 ms and pitch 1, before the
settings were settled.

Added after that: the two knobs a player is most likely to reach for are the
pace and the volume, so both are ranges in SugarCube's native Settings dialog
(`src/js/settings.js`), defaulted to the values above — 62.5 letters a second
(16 ms) and 25 %. The measurements stand as measured, because those are the
defaults the story opens at.
