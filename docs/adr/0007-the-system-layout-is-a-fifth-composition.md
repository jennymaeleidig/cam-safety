# The System layout is a fifth composition, in the title's card

After the player presses Start, but before Layout 0 begins, the story has
nowhere to put a message that is not Cam speaking. Both prose surfaces belong
to someone: the speech bubble is Cam's, voiced and revealed, and the reply bar
is the player's. A pre-game notice in Cam's bubble would look and sound like
Cam; one left in `#passages` would fall out of the stage composition the story
is about to enter.

## Decision

The System layout is **Layout 4**, chosen with `<<set_layout 4>>` like any
other composition: no flag, no second mode, no companion attribute. It is
Layout 0 with the portrait and the speech bubble removed. The system card takes
the bubble's box in design pixels; the reply bar, the menu, the background hue
and the track keep Layout 0's values.

Layout 4 states only the slots it composes — the system card, the reply bar and
the menu. It has no cam or bubble values and no tail knobs, and the cam, hand
and bubble elements stay in the story chrome but are hidden under it, so the
debug outline never reads a slot the layout does not place as missing content.
The stage module skips the portrait and the hand layer on Layout 4: no
automatic phase pose is painted and no authored portrait is shown.

The layout module's upper bound becomes 4. Normalisation is unchanged: a
non-finite value (including a missing `$layout`) is 0, and a finite value is
rounded and clamped to 0–4. The "before Layout 0" ordering is an authoring
convention; the story does not track progression and does not reject Layout 4
later.

A system message is written with `<<system_line>>`. It is wiki-processed and
arrives whole: no reveal, no letter voice, no pose change. The stage writes it
into a new `system` slot and does not hand it to the Reveal; with no Cam line,
the reveal leaves the flushed lines whole, so the message and the reply arrive
together. `<<cam_line>>` and `<<portrait>>` report an authoring error on
Layout 4, and `<<system_line>>` reports one on Layouts 0–3: a macro whose slot
the layout does not compose refuses rather than disappears. The macros read the
published layout at render time, which is why `<<set_layout>>` comes first in a
passage.

**The title screen's card becomes the shared reading card.** The title's
`#passages` already is the framed block a system message needs — the same
green Pixel frame, fill, ink and type. Rather than style a second card to match
it, the block is named: `.reading-card` is the framed surface and
`.reading-card-prose` its inner box. The title's `#passages` wears
`.reading-card` and wraps its existing `.title-screen` in
`.reading-card-prose`; the stage's `system` slot wears the same classes, and
the stage writes the same inner prose box. The card's frame and type are the
title's fixed measurements; only the card's box scales with the stage, and only
the stage instance has a fixed box with an inner scroll. The card follows the
stage's existing `data-state` rule: filled draws the card, empty draws nothing,
so a passage that omits `<<system_line>>` leaves no orphan panel.

## Consequences

**ADR-0003's four fixed compositions are five now.** The direct-set rule, the
`$layout` normalisation and the published `data-layout` seam are unchanged
apart from the upper bound. ADR-0003's opening states the count it was written
with; this record is the amendment.

**A retune of `.reading-card` reaches the title and every system message.**
That coupling is intended: the two are one block, not two lookalikes kept in
step by hand. It also means the title's card is no longer free to diverge from
the system card without a decision.

**The system card is one more slot, not a second content path.** It is written
by the same flush, follows the same `data-state` rule, and is cleared by the
same passage-start reset as every other slot. There is no queue and no second
card.

**Layout 4 is not a general "no character" composition.** It exists because the
story has one pre-game gap. System messages appearing mid-story, or a general
dialogue-without-Cam layout, would be a new decision.

**The ordering is convention, not state.** The story does not know whether
Layout 4 came before Layout 0, and does not need to.
