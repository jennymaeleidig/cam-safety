# Cam Safety

A SugarCube visual novel. The player's exchange with Cam runs in a layout: one
of five fixed framed compositions, and the layout composes the screen.

## Language

**Layout**:
One of the five fixed framed compositions the story can be in, numbered 0–4.
A layout selects the stage's slot geometry, the background's palette and —
where it composes Cam — his phase together. A passage chooses its layout
directly with `<<set_layout>>`; there is no incrementing value behind it.
Layout 4 is the System layout.
_Avoid_: stage, step, tier

**System layout**:
Layout 4: Layout 0 with no Cam portrait and no speech bubble, and the reading
card in the bubble's box. The composition for a System message, used before
Layout 0 by authoring convention.
_Avoid_: system screen, pre-game layout, interstitial

**System message**:
Non-Cam dialogue on the System layout, written with `<<system_line>>`. It
arrives whole — no Reveal, no Voice, no Pose — and its links work at once. It
is not a line of dialogue: the reply bar stays the player's.
_Avoid_: notice, pre-game text, narration

**System card**:
The reading card's stage instance, in the speech bubble's box on the System
layout. A System message fills it; an omitted message draws nothing.
_Avoid_: notice box, message panel

**Phase**:
One of the four sets of Cam's artwork — a neutral and a talking pose each —
one per layout that composes Cam (0–3). A layout selects its phase.
_Avoid_: stage, form

**Pose**:
One of a phase's two artworks: the neutral pose while Cam is silent, the
talking pose while his line is spoken — revealed, or held for the
reduced-motion beat. Each pose carries its own nudge inside the Pixel frame,
so the two line up while the frame stays put.
_Avoid_: state, expression, animation

**Stage mode**:
The display mode in which a `[checker]` passage renders inside the letterboxed
stage frame instead of the reading shell. Derived from the passage's tags.
_Avoid_: checker mode, play mode, stage

**Slot**:
One of the named boxes a layout composes a passage into: Cam's portrait, Cam's
speech-bubble, the system card, the player's reply bar, the menu.
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

**Reading card**:
The framed block the title screen and the system card share: the green Pixel
frame, fill, light ink and link ink, with an inner prose box. `.reading-card`
is the surface; `.reading-card-prose` is the box that scrolls in stage mode.
_Avoid_: panel, page, dialog

**Menu**:
The settings / saves / restart panel. In shell mode it is the rail; in stage
mode it fills the menu slot.
_Avoid_: rail, sidebar, nav, drawer

**Reveal**:
The one-character-at-a-time arrival of Cam's line, one letter of voice per
character. Only Cam's line is revealed; the player's reply arrives whole when
Cam finishes. A link is never revealed character by character: it arrives in
one step and is silent. Under reduced motion there is no Reveal; the talking
pose holds for a beat instead.
_Avoid_: typewriter, typing, animation, effect

**Beat**:
The fixed pause under reduced motion in which Cam's talking pose is held and
the reply waits, standing in for the Reveal's duration. Space, enter, escape
or a pointer press ends it early.
_Avoid_: delay, timer, animation, effect

**Voice**:
The letter sounds the reveal plays — animalese slices, pitched and compressed.
One voice, Cam's; the reply has none.
_Avoid_: audio, sfx, blip, sample

**Music**:
The one looping background layer, playing a single Track at a time — a Track
change overlaps the two for the Crossfade. Separate from Cam's Voice: the
Voice belongs to the Reveal, Music to the scene. A gain of zero — a zero Music
volume or the mute toggle — freezes the Track where it is.
_Avoid_: soundtrack, BGM, audio

**Track**:
One looping background song. A passage selects a Track; the title, Layouts
0–2 and the System layout share the Jamil theme, and Layout 3 has its own
distorted arrangement of it. Each layout's Track is one entry in the track
table.
_Avoid_: song, cue, loop

**Crossfade**:
The overlap in which one Track fades out while the next fades in, over a fixed
duration. A same-Track selection has none: the Track keeps playing from where
it is. A Track change that arrives mid-Crossfade settles the running one and
starts a fresh Crossfade from the track it landed on.
_Avoid_: fade, transition, blend

**Mute**:
The settings toggle that silences Music without changing its volume. Muting
freezes the Track where it is; unmuting resumes it there.
_Avoid_: mute button, silence switch
