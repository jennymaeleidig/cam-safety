# Slot geometry is per-level art direction, not a shared constant

Every level block in `src/css/stage.css` states a slot's full box — position,
size, tail aim, menu availability — even where the value is identical at all
four levels today (the portrait box, the bubble's width and height, the reply
bar's width and height, the menu's box). We keep that duplication rather than
hoisting the level-invariant part into `:root` and letting each level override
only its deltas.

The values are art direction: a level is a framed composition that may be
retuned on its own, so a value that happens to repeat across four levels is
not a shared constant. Hoisting it would make one level's retune silently move
the other three, and the hoist is precisely what an architecture review
proposes when it sees four identical columns of tokens — this record is why it
is declined.

**Consequences.** The portrait box stops spending two tokens on one idea: its
size is one per-level multiplier of the artwork's own 719 × 551 design canvas,
and its aspect is locked to that artwork, so no level crops a pose under
`object-fit: cover`. Level 0's values are still stated twice (on `:root`, as
the fallback for the moment before `data-pressure-level` exists, and in the
level-0 block); that duplication is deliberate and must stay in step.
