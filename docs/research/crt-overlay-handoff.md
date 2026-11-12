# Handoff — analog/CRT overlay for the finished story

Repo: `/Users/jennyleidig/Documents/projects/interactive-media/flock-cam-twine`
(SugarCube 2 visual novel, static build via Tweego; start with `README.md`,
`GLOSSARY.md`, `docs/adr/`, `docs/agents/`).

The work so far was **research plus a throwaway prototype**. The prototype has
been removed from the tree; its essential code is folded into §4 below. No
production code was changed.

**Read the code as a record of what was tried, not as the design.** The
selectors, class names and the DOM it hung off are the old ones and are
expected to change before this ships. The principles in §3 are what should
survive; §4 is the reference implementation of those principles.

## 1. The question

Can an analog/CRT (MiniDV-on-CRT) look be laid over the **entire finished
story** — title/shell mode and stage mode: text, frames, artwork, background,
menus — live and interactive, rather than over one image?

## 2. Verdict

Yes, but only as **additive layers over the DOM**, and only approximately. A
true pixel-processing filter of a live page is not possible in a browser. Five
variants of the real composition were built and screenshotted; the best-looking
combination was a procedural WebGL mask over the whole viewport, plus a
low-strength bloom boxed to the bright surfaces, plus a per-surface tone grade.

## 3. Principles that survived the prototype

1. **No live DOM→texture exists.** `element()` is Firefox-only; html2canvas /
   html-to-image rasterise once through an SVG `foreignObject` (snapshot only,
   every font and image inlined, animated GIFs frozen) and taint the canvas
   under `file://`, which is how this project is verified. `getDisplayMedia`
   needs a permission prompt and self-captures. Never plan on sampling the page
   per frame.
2. **Split the look into three families** and budget them separately:
   - *mask* (scanlines, phosphor grille, vignette, grain, roll) — cheap CSS
     gradients, compositor work, no canvas;
   - *beam* (scanline profile, grille, curvature, aberration, halation) — a
     procedural fragment shader, no texture, no readback;
   - *content-aware* (bloom of real pixels, chroma bleed of text) — needs
     `backdrop-filter` or a snapshot; the expensive, limited part.
3. **Never filter an ancestor of fixed-position elements.** A non-`none`
   `filter` makes that element the containing block for its fixed descendants;
   here the rail, the frame and the hand all leave the viewport when it
   happens. Grade the leaves (background pattern, each panel, the artwork)
   instead of a wrapper. Corollary: a `filter` also creates a backdrop root, so
   a nested `backdrop-filter` stops seeing anything outside that subtree — tone
   and content-bloom are mutually exclusive on the same surface.
4. **Layering is the hard part, not the effect.** A viewport overlay must be
   `pointer-events:none` (or links, menus and text selection die) and must stay
   below modal/dialog chrome. A layer clipped to the letterboxed frame cannot
   reach anything drawn outside it — this story has at least one such layer (a
   hand drawn above the menu) — so each out-of-frame layer needs its own copy of
   the effect at the same box and origin. General rule: the "screen" is not one
   surface; enumerate every surface that must look on-screen.
5. **Keep the prose out of the mask.** Text stays DOM; the mask/grain/bloom goes
   under it. Scanline pitch in *device* pixels, and choose the grille frequency
   against the background's tile pitch — a grille that beats against an animated
   checkerboard and pixel-art portraits reads as moiré, not as a screen.
6. **Motion rules.** No rolling band over a reading surface and no animated
   grain: on a static page it reads as flicker, not atmosphere. Full-screen
   flashing above ~3 Hz is a WCAG 2.3.1 risk (three-flashes-below-threshold); a
   library's "subtle" 0.15 s flicker is ~6.7 Hz. If the animation lives in a
   shader, `prefers-reduced-motion` must be handled in JS (stop the rAF, draw
   one static frame) — a CSS media query cannot stop it.
7. **Bloom is a level, and it is boxed.** Split it: a free procedural beam bloom
   in the shader, plus a content bloom via `backdrop-filter`. Content bloom must
   sit above what it samples, so over a whole viewport it lands on the text and
   washes it out; boxed to the bright surfaces (artwork, paper) it reads as
   halation and leaves the room crisp. Blooming the background is the worst
   case — largest, brightest area, so it swamps everything. 15% looked best.
8. **The cost model.** A viewport-sized `backdrop-filter` is a full-screen
   offscreen pass that re-runs whenever the backdrop repaints — and here the
   background animates every frame. That dominates everything else. A `filter`
   costs one raster layer and re-rasterises when its content changes, so
   filtering a container that holds an animated GIF redraws the whole container
   per GIF frame — filter the leaf, and prefer elements that already own a
   composited layer. The shader quad is free by comparison.
9. **Measure, don't guess.** rAF cadence (p50/p95, frames over 20 ms) with the
   animated background pausable separates the overlay's cost from the
   background's. Re-run it on target devices before committing.

## 4. Reference implementation (from the deleted prototype)

Illustrative only. Class names are the old ones; the geometry came from the
story's design-pixel variables and would be re-derived against whatever
replaces them.

### 4.1 Placement and stacking

```html
<!-- mask / shader: last thing in the story container, so it paints above the
     menu and the out-of-frame layers, but still under modal dialogs -->
<div id="crt" aria-hidden="true"></div>
<canvas id="crt-gl" aria-hidden="true"></canvas>

<!-- bloom: inside the letterboxed frame, above the artwork, under the prose -->
<div id="crt-bloom" aria-hidden="true"></div>
<div id="crt-bloom-paper" aria-hidden="true"></div>
```

```css
#crt,
#crt-gl {
  position: fixed;
  inset: 0;
  z-index: 3; /* menu is 1, the out-of-frame hand is 2, dialogs are far above */
  pointer-events: none;
}

#crt-gl {
  width: 100%;
  height: 100%;
}

/* Frame-only variant instead: absolute, inset 0, z-index 1 inside the frame,
   which is letterboxed by the frame's own overflow. Then repeat the same
   element inside .stage-cam-hand so the hand is on-screen too. */
```

Letterboxing a viewport-sized layer needs no JS — copy the background layer's
rule (`width: var(--stage-w); height: var(--stage-h); margin: auto` under the
stage-mode attribute). Independent `position: fixed` boxes with the same
width/height/centring share an origin, so a duplicated mask lines up exactly.

### 4.2 CSS mask: two gradients, a vignette, static grain

```css
#crt::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.5; /* 0.34 when the layer sits directly under prose */
  background-image:
    linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.42) 50%),
    linear-gradient(
      90deg,
      rgba(255, 0, 0, 0.055),
      rgba(0, 255, 0, 0.02) 50%,
      rgba(0, 0, 255, 0.055)
    );
  background-size:
    100% var(--pitch, 3px),
    var(--pitch, 3px) 100%;
}

#crt::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(ellipse at center, transparent 42%, rgba(0, 0, 0, 0.5) 100%),
    var(--grain);
  background-size:
    100% 100%,
    140px 140px;
  opacity: 0.85;
}
```

The grain is a static tiled SVG `feTurbulence` data URI (desaturated, ~55%
alpha, `stitchTiles`), painted once — never animated. Pitch belongs in device
pixels, so at DPR 2 the CSS `3px` becomes 3 CSS px = 6 device px; the shader
version gets the scaled value passed in (§4.5).

### 4.3 Bloom: shader half and boxed `backdrop-filter` half

```css
#crt-bloom,
#crt-bloom-paper {
  position: absolute;
  z-index: 1; /* above the artwork, under the bubble text (2) */
  pointer-events: none;
  opacity: calc(var(--bloom, 0) * 0.85);
  backdrop-filter: blur(calc(3px + var(--bloom, 0) * 12px))
    brightness(calc(1 + var(--bloom, 0) * 0.5))
    contrast(calc(1.2 + var(--bloom, 0) * 3)) saturate(1.05);
}

/* the artwork's slot box */
#crt-bloom {
  left: calc(var(--unit) * var(--cam-left));
  top: calc(var(--unit) * var(--cam-top));
  width: calc(var(--unit) * var(--cam-art-w) * var(--cam-scale));
  height: calc(var(--unit) * var(--cam-art-h) * var(--cam-scale));
}

/* the paper's slot box */
#crt-bloom-paper {
  left: calc(var(--unit) * var(--bubble-left));
  top: calc(var(--unit) * var(--bubble-top));
  width: calc(var(--unit) * var(--bubble-width));
  height: calc(var(--unit) * var(--bubble-height));
}
```

One number (`--bloom`, 0–1) drives these and the shader's `u_bloom`, so the two
halves never disagree. Both boxes are hidden at `--bloom: 0`.

### 4.4 Tone, graded per leaf

```css
body[data-tone] .background-pattern,
body[data-tone] .menu,
body[data-tone] .reading-card,
body[data-tone] .bubble-text,
body[data-tone] .reply-bar,
body[data-tone] .portrait,
body[data-tone] .hand {
  filter: saturate(1.14) contrast(1.06) brightness(0.97);
}
```

Do not put this on `#story` (breaks every fixed layer) and do not put it on the
frame as one box (the whole frame re-rasterises on each GIF frame). Leave out
any element whose own `filter` carries a `drop-shadow` — a second `filter`
declaration replaces it.

### 4.5 The procedural shader — mask only, no texture

No readback, no upload, no source canvas. The fragment output is a translucent
dark mask; the page shows through it.

```js
var VERT = [
  "attribute vec2 a_pos;",
  "varying vec2 v_uv;",
  "void main(){",
  "  v_uv = a_pos * 0.5 + 0.5;",
  "  gl_Position = vec4(a_pos, 0.0, 1.0);",
  "}",
].join("\n");

var FRAG = [
  "precision mediump float;",
  "varying vec2 v_uv;",
  "uniform vec2 u_res;", /* device pixels */
  "uniform float u_pitch;", /* scanline period, device pixels */
  "uniform float u_bloom;", /* 0..1, shared with the backdrop layers */
  "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
  "void main(){",
  "  vec2 px = v_uv * u_res;",
  /* bloom softens the beam: the dark line rounds off and the gaps fill */
  "  float scan = pow(abs(sin(px.y * 3.14159265 / u_pitch)), mix(1.6, 0.85, u_bloom));",
  "  float grille = 0.5 + 0.5 * cos(px.x * 6.2831853 / (u_pitch * 1.5));",
  "  float vig = smoothstep(0.30, 0.95, length(v_uv - 0.5) * 1.35);",
  "  float grain = hash(floor(px));", /* static: no u_time in the hash */
  "  float haze = smoothstep(0.85, 0.05, length(v_uv - 0.5)) * u_bloom;",
  "  float a = 0.34 * scan * (1.0 - 0.28 * u_bloom)",
  "          + 0.07 * grille * (1.0 - 0.55 * u_bloom)",
  "          + 0.52 * vig",
  "          + 0.05 * grain",
  "          - 0.16 * haze;",
  "  a = clamp(a, 0.0, 0.92);",
  "  vec3 tint = vec3(0.012, 0.020, 0.014);",
  "  gl_FragColor = vec4(tint, a);",
  "}",
].join("\n");
```

Sizing, viewport and the loop — one frame on init so the layer is never blank,
then rAF:

```js
function sizeGL() {
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = Math.max(1, Math.round(glCanvas.clientWidth * dpr));
  var h = Math.max(1, Math.round(glCanvas.clientHeight * dpr));
  if (glCanvas.width !== w || glCanvas.height !== h) {
    glCanvas.width = w;
    glCanvas.height = h;
    gl.viewport(0, 0, w, h);
  }
}

function drawGL(seconds) {
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(u.res, glCanvas.width, glCanvas.height);
  gl.uniform1f(u.pitch, 3 * Math.min(window.devicePixelRatio || 1, 2));
  gl.uniform1f(u.bloom, bloom); /* 0..1 */
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}
```

One `ResizeObserver` on the host covers resize, rotation and a reflow caused by
a mode switch; cache every `getUniformLocation` once.

### 4.6 Reduced motion (JS-side)

```js
var mq = window.matchMedia("(prefers-reduced-motion: reduce)");

function sync() {
  if (mq.matches) {
    if (raf) cancelAnimationFrame(raf), (raf = null);
    drawGL(0); /* one static frame, animated terms at zero */
  } else if (!raf) {
    raf = requestAnimationFrame(loop);
  }
}

mq.addEventListener("change", sync);
```

### 4.7 Cost probe

```js
function measure() {
  var samples = [], start = performance.now(), prev = start;
  function tick(now) {
    samples.push(now - prev);
    prev = now;
    if (now - start < 3000) return requestAnimationFrame(tick);
    samples.shift(); /* the first delta is the gap before sampling began */
    samples.sort(function (a, b) { return a - b; });
    var q = function (f) { return samples[Math.floor(samples.length * f)]; };
    var over = samples.filter(function (d) { return d > 20; }).length;
    report("p50 " + q(0.5).toFixed(1) + "ms, p95 " + q(0.95).toFixed(1) +
           "ms, " + over + "/" + samples.length + " frames over 20ms");
  }
  requestAnimationFrame(tick);
}
```

Pair it with a pause switch on the background's animation to subtract its cost.

## 5. Sources, and what each is actually good for

- `https://github.com/sefatlmn/halftone` — a p5.js 2D-canvas image processor,
  not a library (no exports, no build step); CPU pixel loops; its own perf test
  allows 50 ms/frame at ~0.25 MP. **Licence: personal/non-commercial, no
  redistribution in whole or in part** — only the look and parameter names are
  reusable, not the code. Useful as a description of the passes (raster
  resample, 4:1:1 chroma bleed, DCT blocking, beam profile, grille/slot mask,
  halation) if someone writes a shader later.
- `https://github.com/Ichiaka/CRTFilter` — **MIT**, one ~284-line file. Not
  published on npm, is an ES module, and its class *replaces* your canvas and
  does `getImageData` + `texImage2D` per frame. Its shader is the reusable part
  but is weaker than its README claims: retrace only brightens (never darkens),
  "tearing" multiplies the image by a second sample, jitter is applied after
  sampling so nothing moves, noise is static, no bloom, no vignette. A
  source of good parts, not a dependency.
- `https://gist.github.com/hut8/fb79cf502846442761d6` — the cheapest real look:
  scanlines + RGB phosphor stripe from two gradients and a `background-size`,
  plus turn-on/turn-off keyframes. Its flicker runs at ~6.7 Hz and its turn-on
  puts `filter` on the screened container (principle 3) — borrow the gradients
  and the power moment, not the rest.
- `https://github.com/ckorhonen/claude-skills/.../tui-designer/references/crt-effects-web.md`
  — **unreliable, do not follow**: a non-existent npm package, a
  `renderElement(HTMLElement)` method that cannot exist, boolean params where
  the library takes floats, 10–100× the real parameter ranges, an "animated"
  scanline that is a visual no-op, 10 Hz flicker, `will-change: filter` as a
  static "optimisation", and an irrelevant React Three Fiber section. Its
  static scanline/vignette snippets and the shape of its reduced-motion block
  are the only salvage.

## 6. Open decisions for the next session

- Coverage: whole viewport (including letterbox bars and the menu) vs the frame
  only. Whole viewport is the honest "the output is a screen" reading;
  frame-only is the legibility-safe one and is where bloom can be boxed.
- Does shell/title mode get any of it, and does the reading card bloom?
- Should Settings/Saves render under the effect? (Decides whether the layer
  lives inside or outside the story's own stacking context.)
- Target devices and frame budget; whether content bloom is affordable at all.
- Whether the goal is a *screen* look (scanlines/grille) or a *print* look
  (halftone/dither of the artwork only). They are different builds; the second
  can be done per passage on the artwork alone.
- Where the decision gets recorded: this repo keeps ADRs in `docs/adr/` and
  specs/tickets under `.scratch/<feature-slug>/` — an overlay architecture call
  is ADR-shaped, implementation tickets go to `.scratch/`.

## 7. Artifacts outside the repo

- `$TMPDIR/crt-handoff/archive/prototype-crt/` — the throwaway prototype and
  `shots/` (screenshots of each variant, including the tone-filter failure and
  the 10%/15%/30% bloom ladder). Useful if the numbers in §4 need re-checking.
- `$TMPDIR/crt-handoff/archive/crt-overlay-research.md` — the citation-heavy
  research note. Written against the old CSS/DOM; provenance only, not a plan.
- The two library clones were deleted; re-clone from the URLs in §5.

## 8. Suggested skills

- `research` — if the next step needs primary sources (shader behaviour, browser
  bugs, `backdrop-filter` cost, WCAG flash thresholds) rather than opinion. The
  archived note shows the citation pattern.
- `prototype` — if the next step is another visual round (it should be: the
  prototype was a rig for answering questions, not a design).
- `domain-modeling` — when the coverage/placement decision is made and needs
  recording as an ADR in `docs/adr/`.
- `code-review` — when real changes land in `src/`, against the standards and
  the originating issue.
