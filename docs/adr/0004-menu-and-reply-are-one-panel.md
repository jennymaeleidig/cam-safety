# The menu and the reply are one panel in two orientations

The menu and the player's reply bar are a pair of chrome panels: one tall, one
wide, the same box turned a quarter turn. The menu keeps one physical size in
both display modes, so entering or leaving the stage does not resize it, and
the reply bar swaps that box's width and height rather than carrying a size of
its own.

The width and height are compromises in opposite directions. The title screen
used to size the menu from the viewport height, and the stage sized it from the
letterboxed canvas, which made the menu change size on the title-to-stage
transition. `--rail-unit` now sets the width: the midpoint between the stage's
design pixel and the shell's height fit, capped so the panel still fits inside
the stage and the viewport. `--rail-height` sets the height from the stage's
design pixel, so the panel keeps the stage menu's old top edge while a shorter
height pulls the top and bottom in around the same centre. Width, padding,
type and gaps remain `--rail-unit` multiples.

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

**The reply keeps the frame and the wide box.** Its height is the menu's
width, and its width keeps the design-height reference rather than following
the menu's reduced height, so the player's line stays wide while the menu pulls
in at the top and bottom.
