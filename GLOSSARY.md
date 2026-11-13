# Cam Safety

A SugarCube visual novel. The player's exchange with Cam runs in a layout: one
of four fixed framed compositions, and the layout composes the screen.

## Language

**Layout**:
One of the four fixed framed compositions the story can be in, numbered 0–3.
A layout selects the stage's slot geometry, the background's palette and Cam's
phase together. A passage chooses its layout directly with `<<set_layout>>`;
there is no incrementing value behind it.
_Avoid_: stage, step, tier

**Phase**:
One of the four sets of Cam's artwork — a neutral and a talking pose each —
one phase per layout. A layout selects its phase.
_Avoid_: stage, form

**Stage mode**:
The display mode in which a `[checker]` passage renders inside the letterboxed
stage frame instead of the reading shell. Derived from the passage's tags.
_Avoid_: checker mode, play mode, stage

**Slot**:
One of the named boxes a layout composes a passage into: Cam's portrait, Cam's
speech-bubble, the player's reply bar, the menu.
_Avoid_: region, area, pane, layer

**The record**:
The per-passage holdings that the content macros fill, and that the stage
writes into its slots once the passage has rendered.
_Avoid_: buffer, state, draft, payload

**Design canvas**:
The 2840 × 1700 canvas a layout's composition is drawn against. Every stage
measurement is either a fraction of it or a design pixel on it.
_Avoid_: resolution, viewport, screen, aspect ratio

**Pixel frame**:
The painted nine-patch border and green panel that every framed surface in
the story takes: 16 × 16 painted corners, stretched edges and a green centre.
_Avoid_: border, outline, chrome, bevel

**Menu**:
The settings / saves / restart panel. In shell mode it is the rail; in stage
mode it fills the menu slot.
_Avoid_: rail, sidebar, nav, drawer

**Reveal**:
The one-character-at-a-time arrival of Cam's line, one letter of voice per
character. Only Cam's line is revealed; the player's reply arrives whole when
Cam finishes. A link is never revealed character by character: it arrives in
one step and is silent.
_Avoid_: typewriter, typing, animation, effect

**Voice**:
The letter sounds the reveal plays — animalese slices, pitched and compressed.
One voice, Cam's; the reply has none.
_Avoid_: audio, sfx, blip, sample
