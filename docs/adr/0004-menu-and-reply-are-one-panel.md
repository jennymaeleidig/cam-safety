# The menu and the reply are one panel in two orientations

The menu and the player's reply bar are a pair of chrome panels: one tall, one
wide, the same box turned a quarter turn and then widened by one shared
scale. The menu keeps one physical size in both display modes, so entering or
leaving the stage does not resize it, and the reply bar derives its dimensions
from that box rather than carrying a size of its own: its width is the box's
height times `--reply-width-scale`, its height the box's width.

The title screen used to size the menu from the viewport height, and the stage
sized it from the letterboxed canvas, which made the menu change size on the
title-to-stage transition. `--rail-unit` now follows the stage's design pixel —
the same unit Cam's portrait and the speech bubble scale with — so the menu and
the reply bar keep their proportion to the rest of the stage at every
resolution. It is capped only where the panel would not fit inside the stage or
the viewport; a short window shrinks the panel instead of clipping it.
`--rail-height` is the same unit times `--rail-h`, so the box keeps its 273:877
ratio when a cap bites. Width, height, padding, type and gaps remain
`--rail-unit` multiples. The panel's frame is drawn at that scale too, floored
at Cam's 16px and capped at 40px, so it stops shrinking with the panel on small
screens while the label size fits whatever content box the frame leaves.

## Consequences

**The menu's box is no longer per-layout art direction.** Each layout still
chooses the reply bar's position and whether the menu is visible, but the menu
is centred vertically in the stage and the reply's size comes from the menu's
rotated box. Per-layout reply widths and heights would reintroduce the two
panels drifting apart, so those values are gone. This is the exception to
ADR-0001's rule that every slot box is stated per layout.

**The menu's content scales with the shared unit.** Type, padding and gaps
still follow `--rail-unit`, so the title and stage menus are identical rather
than merely similar. A short or narrow window shrinks both together.

**The reply keeps the frame and the wide box.** Its width is the menu's
height times `--reply-width-scale` and its height the menu's width, both from
`--rail-unit`, so the two panels scale together and the player's line stays as
wide as the menu is tall, plus that fixed share. The scale is shared, not
per-layout art direction: per-layout reply widths would reintroduce the two
panels drifting apart.
