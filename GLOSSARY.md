# Cam Safety

A SugarCube visual novel. The player's exchange with Cam runs on a pressure
value; pressure selects a level, and the level composes the screen.

## Language

**Pressure**:
The story's single running value, 0–3, that says how hard Cam is pushing. It
selects the level on every passage.
_Avoid_: tension, stress, meter

**Level**:
One of the four pressure settings the story can be in. A level selects the
stage's composition and the background's palette together.
_Avoid_: stage, step, tier

**Phase**:
One of the four sets of Cam's artwork — a neutral and a talking pose each —
one phase per level.
_Avoid_: level, stage, form

**Stage mode**:
The display mode in which a `[checker]` passage renders inside the letterboxed
stage frame instead of the reading shell. Derived from the passage's tags.
_Avoid_: checker mode, play mode, stage

**Slot**:
One of the named boxes a level composes a passage into: Cam's portrait, Cam's
speech-bubble, the player's reply bar, the menu.
_Avoid_: region, area, pane, layer

**The record**:
The per-passage holdings that the content macros fill, and that the stage
writes into its slots once the passage has rendered.
_Avoid_: buffer, state, draft, payload

**Design canvas**:
The 2840 × 1700 canvas a level's composition is drawn against. Every stage
measurement is either a fraction of it or a design pixel on it.
_Avoid_: resolution, viewport, screen, aspect ratio

**Pixel frame**:
The two-band painted border with staircase-cut corners that every framed
surface in the story takes.
_Avoid_: border, outline, chrome, bevel

**Menu**:
The settings / saves / restart panel. In shell mode it is the rail; in stage
mode it fills the menu slot.
_Avoid_: rail, sidebar, nav, drawer
