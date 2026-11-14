# Music is one looping track, selected by passage

The story has a background layer as well as Cam's voice. It is one looping
track at a time, and the track is a property of what the player is looking at:
the title and Layouts 0–2 share one track, and Layout 3 will have its own.

## Decision

One module owns one media element. The element is declared in the story chrome
and the module is its only writer: source, playback, volume. It is not part of
Cam's voice. The voice is Web Audio letters, built for short overlapping
slices; music is a long-lived media element whose repetition is `loop` and
whose gain is its `volume`. They share no node or gain, so the two settings
cannot move each other.

A passage selects its track through the existing passage-start lifecycle,
before the passage renders, and the selection is published as
`body[data-track]` — the same published-seam idiom as `data-layout` and
`data-stage-mode`. Selection is by passage, not by layout alone: the title is a
shell-mode passage and keeps whatever layout was last published, so it has to
be named explicitly. Every other passage uses its layout's entry.

A same-track selection leaves the element alone, so the title into Layout 0 and
Layouts 0 → 1 → 2 are one continuous track. A different track swaps the source
and starts the new song. Layout 3 currently names the same track as the other
layouts, as a placeholder; when its song arrives, only the track table changes.

The gain is read through the settings contract as one semantic value,
`CamSettings.musicGain()`, a gain in [0, 1] with mute folded in. The music
module learns neither percent nor the mute flag nor a default. Mute therefore
leaves the stored volume untouched, and unmuting restores the player's level.
A gain of zero pauses the element, so the track freezes where it is; lifting
the zero resumes from the same position. The music settings' `onChange` hook
asks the module to re-read the gain, so a drag or a mute press is audible at
once.

Browsers refuse audio before a gesture. The module asks to play and, if the
promise rejects, waits for the page's first pointer or key press. A muted
player is not a failed autoplay: the element sits paused and ready, and the
unmute press is itself the gesture that starts it.

## Consequences

**There is one audio element, not one per track.** A track change reuses it,
so a new song cannot overlap the old one. There is no crossfade in this
change.

**Track selection is inspectable without listening.** `data-track` names what
is playing, so a placeholder cannot masquerade as a distinct track, and a
future Layout 3 song changes one entry in the track table.

**Music and voice are tuned independently.** Music volume and Letter volume
are separate ranges; mute belongs only to music. A player who silences the
music still hears Cam's letters, and a zero Letter volume still leaves the
track playing.

**Music is a relative asset, not story payload.** The track is copied beside
the built story and referenced by URL, so the HTML does not grow by the audio
file and the story still starts from `file://`.

**Reduced motion does not touch music.** The motion preference governs the
Reveal and the beat, not the scene's sound.
