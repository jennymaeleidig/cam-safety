# border.png as a nine-patch frame

Research for the spec at `.scratch/nine-patch-frame/spec.md`. The research
phase changed no production code; the implementation is a separate change.

Accessed 2026-11-12.

## 1. What the asset is

`include/images/dialogue/border.png` is 64 × 64, 8-bit RGBA, nine flat colours
(no anti-aliasing) plus transparent corners. The centre is a flat green
`#216B00`. The painted ornament is a two-band brown frame: the top and bottom
bands are about 7 source pixels deep, the side bands about 13, with the
ornament drawn inside a 16-pixel edge slice. The centre region is 32 × 32 at a
16-pixel slice.

`border.png` samples:

| Region | Source pixels | Notes |
| --- | --- | --- |
| Outer ring | 0–5 / 58–63 both axes | dark red `#4A0000` to orange `#DE944A` |
| Ornament | about 7px top/bottom, 13px sides | side bands are heavier than top/bottom |
| Centre | 13–50 x, 7–56 y | flat `#216B00` |
| Corners | 2 transparent pixels at each corner | a hard pixel-rounded corner, not a CSS radius |

The green is close to, but not identical with, the current `--pixel-fill`
(`#1D6300`). Using the image's fill makes the panel's green the asset's green.

## 2. The nine-patch division

The division implied by the request is **16 | 32 | 16 on both axes**: 16 × 16
corners, a 32 × 32 centre. That sums to 64, and it is the only reading of
`16 32 16 / 32 / 16` that produces a usable nine-patch from this 64-pixel
source.

In CSS terms:

- `border-image-slice: 16 fill` — source pixels, not lengths. `fill` keeps the
  32 × 32 green centre.
- `border-image-width` controls how thick the painted frame is. The intended
  weight is 16 CSS px on every side, so the corners are drawn 16 × 16 at 1:1.
  The 32 is the source centre, not a border weight. CSS pixels, not the
  stage's design pixels, keep the pixel-art corners crisp; this is the one
  stage chrome that does not scale with `--stage-unit`.
- `border-image-repeat: stretch` — the default, and the closest match to
  Godot's `NinePatchRect` default axis-stretch mode. The edge bands are flat
  enough to stretch. A tall rail stretches the side ornament; that was
  checked in a throwaway ImageMagick nine-patch and reads as a long painted
  rule rather than a broken corner.

A literal `border-image-slice: 16 32 16 32` was also simulated. It is wrong:
the left and right slices consume the whole image width, leaving a zero-width
top and bottom edge. The top and bottom border disappear, and the side bands
balloon. This is why the 32 in the request is read as the centre of the
16 | 32 | 16 division, not as a CSS slice value or a border weight.

A natural slice at the actual ornament boundary (`7 13 7 13`) looks cleaner on
tall panels, but it cuts into the side band's corner motif, which is 16 rows
tall: the fragment left in the edge tile stretches into a dark-green notch.
The cam portrait therefore keeps the 16 | 32 | 16 slice and draws the border
image at its full 16px, preserving every corner. Its real border width — the
content inset — is `7px 13px`. The border image is painted below content, so
the portrait covers the extra 9px/3px of image that reaches into the padding
box; the visible ornament is the native 7px/13px band, with no green padding
between it and the portrait. Every other framed surface keeps the 16 | 32 | 16
slice, 16px width and 16px inset. The measured bands are the art's own edges,
and the cam is the one surface whose content meets them.

## 3. CSS border-image behaviour that matters here

From MDN (`border-image`, `border-image-slice`, `border-image-width`,
`image-rendering`) and the CSS Borders and Box Decorations module:

- `border-image` is painted **above the element's background and box-shadow,
  and below its content**. This decides the layering on the portrait: a
  border image on the cam slot is the portrait's backdrop, not a chrome ring
  over the artwork.
- `border-image-slice` takes unitless numbers for raster images. The numbers
  are source pixels, not CSS lengths. `16` is correct; `16px` is not valid
  for a raster slice.
- `border-image-width` can be set independently of `border-width`. It can
  define the drawn border area without reserving layout space. That is the
  tool for the cam slot, whose portrait must keep the artwork's full box and
  aspect.
- On text surfaces, the real `border-width` is the border area. With
  `box-sizing: border-box` (already used), the content box shrinks and the
  text stays clear of the ornament. Padding must not be smaller than the
  border.
- `border-image` does not follow `border-radius`; any radius/clip-path is
  unrelated to it and should be removed rather than combined.
- The image is painted in the border area, which does not scroll with an
  element's overflow content. That is why a border image is a better fit for
  the rail and the reading card than an inset `box-shadow` child would be.
- `image-rendering: pixelated` is specified to apply to images set in an
  element's other properties, which includes border images. Browser support
  for the combination is not perfect: WebKit bug 289023 (2025) records
  `image-rendering` failing on background images when a border is set, and
  Chrome has had related canvas/border bugs. Keep `pixelated` on the framed
  surface; if a target browser blurs the border, a 2x asset is the fallback,
  not deleting the rule.

## 4. Godot NinePatchRect mapping

Godot's `NinePatchRect` splits a texture into a 3 × 3 grid with
`patch_margin_left/top/right/bottom` (source pixels), draws the four corners
once, and stretches or tiles the edges and centre according to
`axis_stretch_horizontal/vertical`. `draw_center` is the `fill` keyword;
`AXIS_STRETCH_MODE_STRETCH` is the default and the closest match to CSS's
default `border-image-repeat: stretch`; `AXIS_STRETCH_MODE_TILE_FIT` is the
closest match to CSS `round`.

The CSS equivalent of the desired panel:

- patch margins: 16 on all four sides (centre 32 × 32)
- draw centre: on (`fill`)
- axis stretch: stretch (default)
- drawn border weight: 16 on all four sides, so the corners stay 16 × 16;
  the 32 is the stretched centre

## 5. Layering consequences

`border-image` below content means:

- **Cam slot.** Applying the border image to the slot gives the green centre
  and the painted frame as the portrait's backdrop. The portrait image is
  content, so it paints above the border image. Transparent GIF pixels show
  the green centre; opaque pixels can overlap the ornament. This matches the
  request to replace the "cam background" with the painted panel. The shipped
  slot instead reserves the border as a real width, the inset-portrait
  alternative below: the portrait's content box shrinks by the ornament, so
  the whole image stays in the green centre, at the cost of a slightly smaller
  portrait and a small object-fit crop. The other rejected alternative is a
  second border-image overlay without `fill` (duplicates the ring).
- **Text surfaces.** A real border width keeps the content inside the
  ornament. The green centre is the panel's fill, so the surfaces no longer
  need a separate `--pixel-fill` background; keeping it as a fallback is
  harmless, but clip it with `background-clip: padding-box` so it does not
  fill the border image's transparent corner pixels. The cam has no
  background at all, so its corners already show the checkerboard; the text
  surfaces should match it.
- **Empty slots.** The existing `data-state="filled"` gate on the cam and
  reply slots still decides whether either surface draws a frame. The rail
  and the reading card are always framed.

## 6. Verification seam

There is no test runner in this repo; verification is manual, in the built
story (see the README). The relevant seams already exist:

- shell vs stage mode: `body[data-stage-mode]`
- layout: `body[data-layout]`
- slot state: `[data-state="filled"]`
- the scratch passages: `Layouts` / `Layout 0..3`, `Stage content`,
  `Stage content empty`

No new seam is needed. The visual checks are: both modes, all four layouts,
empty/filled slots, long scrolling text, the hidden menu at layout 3, a short
window, and a 2dppx display.

## 7. Follow-up: the speech bubble's `speech.png`

`include/images/dialogue/speech.png` is 64 × 64, a #f8f8f8 paper with a 2px
black outline, 4px stepped corners and transparent corner pixels. It uses the
same 16 | 32 | 16 division as the frame: the 16px slice includes the 2px
outline plus white paper, and the 32 × 32 centre stretches. The speech paper
is drawn at 2× (32px), so its outline and stepped corners render larger —
4px and 8px — while `image-rendering: pixelated` keeps each source pixel a
whole block. Slicing at the actual 4px corner instead would scale the outline
unevenly, so `16` remains the right slice.

The follow-up draws the card on the bubble shape itself and deliberately
leaves the pointer tail out: the tail is a separate silhouette with its own
art, and the black outline would otherwise cut it off from the card. The
per-level tail knobs stay in the stylesheet for that deferred work. The prose
slot gets the same 16px as a transparent border, so a scrolled line stops at
the outline instead of painting over it.
