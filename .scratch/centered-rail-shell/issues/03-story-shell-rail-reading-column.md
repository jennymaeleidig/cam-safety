# 03: Story shell — left rail + centered reading column

**What to build:** The UI shell module, a separate module from the narrative: a StoryInterface
providing a persistent left rail (game title, Settings / Saves / Restart wired to
SugarCube's built-in dialogs, prev/next present but commented out) beside a centered reading
column holding the single `#passages`. A layout stylesheet carries the shell's dimensions
(rail width, reading-column max width, main padding) as tunable CSS custom properties so a
second layout is a value change, not a fork. A small shell-behavior script hides the rail
title on any passage tagged `[title]` and shows it otherwise (tag-driven, not hardwired to a
passage name). The shell must NOT author a `#story` element — SugarCube provides it; a
duplicate is fatal. The existing checkerboard background is left untouched and coexists with
the shell. Demoable: every passage renders in the centered column with the rail;
settings/saves/restart open the built-in dialogs; tagging any passage `[title]` hides the
rail title (on the title screen the big title is already shown).

**Blocked by:** 02: Title screen and start repoint

**Status:** ready-for-agent

- [ ] Every existing and future passage renders inside the centered reading column with the rail persistent — no per-passage markup
- [ ] Rail shows the game title plus Settings, Saves, Restart; each opens SugarCube's built-in dialog
- [ ] Prev/next controls exist in the rail markup but are commented out (re-enabling is a one-line change)
- [ ] Rail title is hidden on any passage tagged `[title]` and shown on all others
- [ ] The shell authors no `#story`; the single-`#passages` contract holds (ticket 01's gate stays green)
- [ ] Checkerboard background remains in place, decoupled from the shell layout
- [ ] The story still compiles with the existing Tweego invocation — no build-config change
