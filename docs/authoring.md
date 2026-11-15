# Authoring

A passage writes its visible content through macros. Each macro fills one
stage slot and renders nothing into `#passages`, because stage mode hides that
element. The layout decides where a slot sits; the macro decides what it holds.

## Stage mode

A passage tagged `[checker]` renders inside the stage frame. The title is
tagged `[title checker]` and keeps the reading shell; so does any passage
without a tag.

In stage mode the player sees only what the line macros put in the slots.
Passage prose, a bare `[[link]]` and a macro error never reach the screen. Put
every exit in `<<player_line>>` or `<<cam_line>>`, and read authoring errors
from the console or the DOM.

## Macros

| Macro | Slot | Takes |
| --- | --- | --- |
| `<<set_layout N>>` | none | an integer 0–4 |
| `<<cam_line "…">>` | speech bubble | a quoted line |
| `<<player_line "…">>` | reply bar | a quoted line |
| `<<system_line "…">>` | system card | a quoted line, Layout 4 only |
| `<<portrait "path" "alt">>` | Cam's portrait | an image path, optional alt |

`<<set_layout>>` comes first in the passage. It publishes the layout while the
passage renders, before it is displayed, so the first frame is already
composed. A direct `<<set $layout>>` takes effect on the next passage instead.

Every line is wiki-processed: `$variables`, formatting and `[[links]]` work
inside the quoted text.

A slot holds only what this passage writes. Omit a line macro and its slot is
empty, even if the previous passage filled it. Omit `<<portrait>>` and, on
Layouts 0–3, the slot shows the layout's phase.

`<<set_layout>>` with no argument reports an error. `<<cam_line>>` and
`<<portrait>>` report one on Layout 4, which composes no bubble and no
portrait; `<<system_line>>` reports one on Layouts 0–3, which compose no system
card.

## Layouts

| Layout | Composes | Menu | Track |
| --- | --- | --- | --- |
| 0 | Wide, Cam bottom-right, phase 0; bubble tail bottom-right | shown | theme |
| 1 | Cam bottom-left, phase 1; tail bottom-left | shown | theme |
| 2 | Cam upper-left, phase 2; tail top-left | shown | theme |
| 3 | Close-in on the left, phase 3; tail left-mid | hidden | distorted |
| 4 | System card in the bubble's box, no portrait or bubble | shown | theme |

Slot geometry, the background palette and the tail's aim live in
`src/css/stage.css` and `src/css/checker.css`, keyed on `body[data-layout]`.

## The portrait

Omit `<<portrait>>` and Cam shows the layout's phase: a neutral pose while he
is silent and a talking pose while his line is revealed. This is what most
passages want.

`<<portrait "images/cam/phase-2/neutral/phase-2-neutral-body.gif">>` pins one
image for the whole passage. It carries no talking pose, so Cam does not
animate while he speaks. The alt text defaults to "Cam".

Paths are relative to the built `dist/story.html`. The build copies
`include/images/` to `dist/images/`, so name them `images/…`; the phase art
lives in `include/images/cam/phase-N/`.

## Lines

`<<cam_line>>` is revealed one character at a time, with a letter of Voice per
character, and Cam takes his talking pose while it grows. A link in the line
arrives whole and silent, and is clickable once it lands.

`<<player_line>>` arrives whole after Cam finishes. Its links are live on
arrival.

Under reduced motion there is no reveal. Cam's talking pose holds for one beat
and the reply waits behind it; space, enter, escape or a pointer press ends the
beat.

`<<system_line>>` arrives whole, with no reveal, no Voice and no pose change.
Its links work at once. Unlike `<<cam_line>>`, it belongs only on Layout 4.

## The System layout

Layout 4 holds the title screen's reading card in the speech bubble's box,
with no Cam and no bubble. Use it for a message that is not Cam speaking,
conventionally before Layout 0:

```text
<<set_layout 4>>
<<system_line "…">>
<<player_line "The way on. [[Layout 0->Layout 0]]">>
```

The reply bar and the menu sit where Layout 0 puts them, so the way on still
belongs in `<<player_line>>`.

## Trying a passage

The scratch passages in `src/story.twee` (`Layouts`, `System content`, `Stage
content` and their variants) are not linked from the story. Open one from the
browser console in the built story:

```js
SugarCube.Engine.play("Layouts");
```

They exercise each layout, the reveal, the empty slots and the mode errors.
`docs/verification.md` walks the same ground with what to look for.

Macro descriptions for the editor live in `story.twee-config.yaml`; update it
when a macro's signature changes.
