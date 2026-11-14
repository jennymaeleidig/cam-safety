# A track change crossfades

ADR-0005 gave the story one media element, so a track change swapped its source
and the old song stopped the instant the new one started. Layout 3 now has its
own song — a distorted arrangement of the theme — and the change arrives at the
most dramatic moment in the composition. A hard cut there is audible as a
mistake: it lands on a downbeat instead of carrying the scene across.

## Decision

The story chrome declares two looping media elements instead of one, and the
music module reads them as an unordered pair. The pair is what persists; which
element carries the current track alternates with each change.

A track change starts the incoming song on the idle element at volume zero and
overlaps it with the outgoing one for a fixed duration, at the end of which the
outgoing element is paused and its source dropped. A same-track selection does
nothing, exactly as before: the title into Layout 0 and Layouts 0 → 1 → 2 stay
one continuous track with no fade.

The fade's two levels and the player's gain compose into `volume` on each
element: the element's volume is `gain() × level`, where `level` moves from 1
to 0 on the outgoing element and 0 to 1 on the incoming one. Changing the
Music volume or muting mid-fade is therefore applied to both elements on the
next frame, and a zero gain pauses both so the pair freezes in place.

A selection that arrives while a fade is still running settles it first: the
incoming track lands at full level, the outgoing one is released, and the new
change starts a fresh crossfade from there. The pair cannot hold three tracks,
and snapping the half-finished fade is less surprising than a third element
appearing for one passage.

The duration is a module constant, not a setting: it is part of how a layout
change sounds, not something the player tunes.

## Consequences

**Crossfading needs two elements, not one.** ADR-0005's single element was what
made a hard cut unavoidable; the pair is the price of overlapping tracks. Any
code that reaches for "the" music element should ask which of the pair is
carrying the track.

**The module is still the only writer.** Both elements are declared in markup
and the module owns their sources, playback and volumes; nothing else knows the
pair exists.

**The seam is unchanged.** `body[data-track]` still names the track the player
is moving into, so the selection stays inspectable without listening, and a
layout's song remains one entry in the track table.

**Autoplay and mute rules carry over.** The incoming element asks to play; if
the browser rejects before a gesture, the module arms its one-shot retry as
before. A muted player still pauses rather than waits, and the unmute press is
the gesture that starts the track.
