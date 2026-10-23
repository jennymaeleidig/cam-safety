# 02: Title screen and start repoint

**What to build:** The game opens on a title screen: the big game name, a Start action that
chains into the existing first passage, and a Load option shown only when a save exists. The
story's start is repointed to the title screen; the narrative passages and the
`raise_pressure` macro are untouched. Demoable: open the compiled story → see the title →
Start enters the story exactly as before.

**Blocked by:** 01: Baseline build gate

**Status:** ready-for-agent

- [ ] Opening the compiled story lands on a title screen showing the game name
- [ ] Start chains into the existing first passage; narrative flow from there is unchanged
- [ ] Load appears on the title screen only when a save exists
- [ ] Story start field repointed to the title screen; no other story-data change
- [ ] No narrative passage or the `raise_pressure` macro is modified
