# Slot geometry is per-layout art direction, not a shared constant

Every layout block in `src/css/stage.css` states a slot's full box — position,
size, tail aim, menu availability — even where the value is identical at all
four layouts today (the portrait box, the bubble's width and height). We keep
that duplication rather than
hoisting the layout-invariant part into `:root` and letting each layout
override only its deltas.

The values are art direction: a layout is a framed composition that may be
retuned on its own, so a value that happens to repeat across four layouts is
not a shared constant. Hoisting it would make one layout's retune silently move
the other three, and the hoist is precisely what an architecture review
proposes when it sees four identical columns of tokens — this record is why it
is declined.

ADR-0004 carves out one exception: the menu and the reply are one paired panel,
so their sizes are shared rather than per-layout art direction. A layout still
chooses the reply's position and the menu's visibility.

**Consequences.** The portrait box stops spending two tokens on one idea: its
size is one per-layout multiplier of the artwork's own 719 × 551 design canvas,
and its aspect is locked to that artwork, so no layout crops a pose under
`object-fit: fill`. Layout 0's values are still stated twice (on `:root`, as
the fallback for the moment before `data-layout` exists, and in the layout-0
block); that duplication is deliberate and must stay in step.
