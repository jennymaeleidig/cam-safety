# 04: Remove build gate + prototype cleanup

**What to build:** Remove the throwaway build-verify step from ticket 01 and delete the
throwaway prototype layout. From this point the story is tested manually against the Tweego
build step (build, then open the compiled story in a browser). Demoable: the repo contains
no build-verify scaffolding and no prototype layout, and the story still builds and plays
correctly.

**Blocked by:** 03: Story shell — left rail + centered reading column

**Status:** ready-for-agent

- [ ] The build-verify step from ticket 01 is removed from the repo
- [ ] The throwaway prototype layout is deleted
- [ ] The story still compiles with the existing Tweego invocation
- [ ] Manual browser pass: opens on the title screen (rail title hidden) → Start → narrative in the centered column (rail title shown); Settings / Saves / Restart open the built-in dialogs; checkerboard background intact
