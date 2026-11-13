# The layout is set directly, not derived from pressure

The story has four fixed framed compositions, and a passage chooses one. There
is no progression behind that choice: earlier drafts carried a `$pressure`
value that a macro incremented and a mapping turned into a "level", but the
screen was never ranking anything — a passage simply wanted one of four
compositions. Keeping pressure meant authors wrote an indirect value, and the
code carried a pressure-to-level mapping that described a progression the
story does not have.

## Decision

The running value is `$layout`, a number 0–3. A passage sets it with
`<<set_layout N>>`, which applies to the passage that contains the macro: the
layout module publishes `body[data-layout]` synchronously while the passage
renders, in the same task and before it is displayed, so the first visible
frame is the new composition. There is no increment and no mapping.

`src/js/layout.js` is the only writer of `data-layout` and the only place the
value is normalised: a non-finite value (including a missing `$layout`, as in
an old save) becomes 0; a finite value is rounded and clamped to 0–3. The
`<<set_layout>>` macro and the lifecycle's start phase both delegate to it, so
restoring a save publishes through the same writer. A `<<set_layout>>` with no
argument reports an authoring error and leaves the current layout unchanged.

The stylesheets, the stage module and Cam's neutral pose read the published
attribute and never recompute a layout. Layout 0 is the fallback: `:root`
carries its values, so the stage is composed before any attribute exists.

## Consequences

**Old saves compose as Layout 0.** There is no migration from `$pressure`; a
save without `$layout` normalises to 0 on the next start phase.

**Setting `$layout` directly is a next-passage act.** It bypasses the macro's
synchronous publish, so an author who wants the current passage composed must
use `<<set_layout>>`. The two writers are otherwise one module.

**The four compositions are unchanged.** This removes a vocabulary and an
indirection, not a retune: per-layout geometry, palette, Cam's phase and menu
availability keep their present values, and ADR-0001's per-layout blocks still
state full geometry, except for the menu and reply sizes carved out by
ADR-0004.

**Documentation follows the model.** The glossary defines Layout, Phase and
Slot in these terms, ADR-0001 is named per layout, and the README and macro
descriptions use `<<set_layout>>`.
