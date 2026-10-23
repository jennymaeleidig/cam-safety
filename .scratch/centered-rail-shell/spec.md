Status: ready-for-agent

# Story shell — centered reading column + left rail, with title screen

## Problem Statement

From the author's / player's perspective: the story currently opens straight into
raw narrative passages on an unstructured default page (SugarCube's default chrome
plus an animated checkerboard background). There is no consistent presentation, no
home for the "surrounding settings," and no title screen. The author wants a
deliberate layout: the narrative text presented as a calm, centered reading column,
a small set of settings/saves/restart controls available in a persistent rail around
it, and a title screen up front. It must be a **minimal, modular addition** to the
existing story — not a rewrite — and easy to extend later (e.g. a second layout, or
turning prev/next navigation back on).

## Solution

Wrap the existing story in a **shell**: a persistent **left rail** (game title +
Settings / Saves / Restart) beside a clean, **centered reading column** where each
passage's text renders. Add a **title screen** at the start (big title + Start, and
Load when a save exists). The rail's small title is **hidden on the title screen**
and shown during play, and is toggleable per-passage via a passage tag. The
prev/next controls exist in the markup but are **commented out** for now. All
settings use **SugarCube's built-in dialogs** (no custom settings UI). The existing
narrative passages, the `raise_pressure` macro, and the checkerboard background are
left untouched; the story is only repointed to start on the new title screen.

## User Stories

1. As a player, I want the game to open on a title screen showing the game name, so I know what I'm about to play.
2. As a player, I want a clear "Start" action on the title screen, so I can begin the story.
3. As a player, I want a "Load" option on the title screen only when a saved game exists, so I can resume without seeing a pointless empty option.
4. As a player, I want the story text centered in a comfortable reading column, so it is easy to read.
5. As a player, I want the surrounding controls (settings / saves / restart) available without covering the text, so I can adjust things without losing my place.
6. As a player, I want to open the game's settings, so I can change text size and preferences.
7. As a player, I want to save my progress, so I can resume later.
8. As a player, I want to restart the story, so I can start over.
9. As a player, I want the game name visible during play (in the rail), so I always know which game I'm in.
10. As a player, I want the rail's title hidden on the title screen (where the big title is already shown), so the title screen isn't cluttered with a duplicate name.
11. As a player, I want the rail's title to reappear as soon as I enter the story, so the persistent anchor returns.
12. As a player, I want the existing checkerboard background to remain, so the game keeps its current look.
13. As a player, I want to be free of forced prev/next buttons for now, so I move through the story via the in-text links as it intends.
14. As the author, I want the shell to be a separate module from the narrative, so the story text stays clean and the chrome is edited in one place.
15. As the author, I want any passage I add to automatically render inside the centered reading column, so I never restructure the shell per-passage.
16. As the author, I want the rail's title to be suppressible per-passage via a tag, so I can hide it on any passage (like the title screen) without editing the shell.
17. As the author, I want the shell's key dimensions (rail width, column width, margins) exposed as tunable knobs, so a second layout can be added by changing values rather than forking the shell.
18. As the author, I want settings to rely on SugarCube's built-in dialogs, so I don't maintain a custom settings UI.
19. As the author, I want prev/next present-but-disabled (commented out), so re-enabling navigation later is a one-line change.
20. As the author, I want the existing narrative and the `raise_pressure` macro untouched, so gameplay logic keeps working unchanged.
21. As the author, I want the whole thing to build with the existing Tweego command, so there's no new build tooling.
22. As the author, I want the checkerboard background left in place but decoupled, so dropping it later is independent of the layout.
23. As the author, I want the title screen's "Start" to chain into the existing first passage, so the story flow is otherwise unchanged.
24. As an AFK agent, I want the one non-obvious constraint pinned down in the spec (SugarCube provides `#story`; the shell must not author its own), so I don't reintroduce a fatal error.
25. As a maintainer, I want a build-time check that the compiled story has exactly one `#passages` and no authored `#story`, so the fatal layout error is caught before it ships.

## Implementation Decisions

- **UI shell module (new).** A SugarCube `StoryInterface` special passage plus a
  title-screen passage. The `StoryInterface` is raw HTML and provides the shell: a
  left rail (title + Settings/Saves/Restart, with prev/next commented out) and a
  centered reading column that contains the single `#passages` element.
  **Contract / key gotcha: it must NOT author a `<div id="story">` element.**
  SugarCube wraps the interface content in its own `#story`; authoring one is a
  fatal build/runtime error (hit in the prototype). Preserve the single-`#passages`
  contract.

- **Layout stylesheet module (new).** Carries only the shell layout, using semantic,
  project-scoped class names (shell / rail / rail-title / rail-actions / main) and a
  small set of CSS custom properties for the tunable knobs. The existing checkerboard
  stylesheet is untouched and coexists with it.

- **Shell-behavior script module (small, new).** This **supersedes the earlier
  "no JS" preference**: the rail title must toggle per-passage, which is a runtime
  behavior the raw-HTML shell cannot express. The script hooks SugarCube's
  passage-display event and toggles the rail title based on a passage tag.

- **Toggle contract (from the prototype, decision-rich):**

  ```
  passage tagged [title]  ->  rail title HIDDEN
  any other passage       ->  rail title SHOWN
  ```

  Tag-driven (not hardwired to one passage name) so any future passage can opt in.

- **Reusable knobs (from the prototype, decision-rich):** a short set of CSS custom
  properties — rail width, reading-column max width, main padding — so a second
  layout is a value change, not a fork.

- **Chrome wiring.** The rail's Settings/Saves/Restart use inline calls to SugarCube
  global UI APIs (`UI.settings()` / `UI.saves()` / `UI.restart()`), because macros
  are **not** processed inside a `StoryInterface`. The title-screen passage _is_
  wiki-processed (it renders into `#passages`) and uses standard SugarCube link
  macros, showing Load conditionally on whether any save exists.

- **Passage-agnostic shell.** The shell frames whatever renders into `#passages`;
  every existing and future passage is automatically presented in the centered column
  with the rail. No per-passage markup is added to the narrative.

- **Built-in settings only.** No custom font-choice / autosave / theme / notification
  settings (those frills from the original template are dropped). "Settings" opens
  SugarCube's stock settings dialog.

- **Prev/next: present but disabled.** The controls exist in the rail markup,
  commented out for now; re-enabling is a one-line change.

- **Start repoint.** The story's start is repointed to the title-screen passage (a
  single field change in the story data). The title screen's "Start" links to the
  existing first passage, so the narrative flow is otherwise untouched.

- **No backend, no new build tooling.** The story still compiles with the existing
  Tweego invocation, which merges all `.twee` files in the story directory and
  auto-includes the css/ and js/ subdirectories. No build-config change.

## Testing Decisions

- **What makes a good test here:** assert on the **external, observable behavior** of
  the compiled story — that it builds, that it starts on the title screen, that the
  shell invariants hold, that the chrome is present and wired — not on internal class
  names or DOM detail beyond the contract.

- **The single automated seam (highest practical for this project, which has no test
  framework): the compiled story.** A thin build-verify step (1) runs the existing
  Tweego build and asserts success, then (2) asserts the external invariants of the
  compiled output: exactly **one `#passages`**; **no authored `#story`** in the shell;
  the rail + title-screen passage present; the layout stylesheet + shell-behavior
  script are bundled; the story start is the title-screen passage; the checkerboard
  modules are still present. This one seam catches the real failure modes (the fatal
  double-`#story`, missing modules, wrong start) at build time, with no browser.

- **Existing gate:** Tweego's own build-time structural validation already fails on a
  missing/duplicate `#story`/`#passages` (zero new code). The verify step layers the
  module-bundling + start assertions on top.

- **Runtime behavior is verified manually in a browser for now** (rail title actually
  hiding on the title screen, the Settings dialog opening, the story flow). The
  truest seam — a headless-browser harness driving the story — is the path if
  automated UI testing is later wanted; adding a browser test framework is out of
  scope here.

- **Prior art:** the project currently has no automated test suite; Tweego's
  build-time structural validation is the only existing "test." The verify step is
  the first lightweight automated check.

## Out of Scope

- Custom settings UI (font choice, autosave, theme, notifications) from the original
  template — built-in settings only.
- Prev/next navigation behavior (present but disabled; wiring it up is a later ticket).
- A second / alternative layout (the CSS knobs are in place to enable it; adding the
  layout itself is future work).
- Removing or restyling the checkerboard background (it stays; decoupled and can be
  dropped separately).
- An automated browser/UI test harness (no test framework added; behavior verified
  manually).
- Changes to the narrative passages, the `raise_pressure` macro, or story data other
  than the start field.
- Responsive / mobile-specific behavior of the shell.

## Further Notes

- **Concrete execution plan (paths).** The UI shell (StoryInterface + title passage)
  goes in a new `.twee` file alongside the narrative; the shell layout in a new CSS
  file under the story's css directory; the small shell-behavior script in a new JS
  file under the story's js directory; the narrative file gets only the start-field
  change. Tweego, pointed at the story directory, merges all `.twee` files and
  auto-includes the css/ and js/ subdirectories, so no build-config change is needed.
- **Prototype cleanup.** `prototype/layout/` is throwaway and is deleted once the
  shell is folded into the real modules.
- **Gotcha (repeated on purpose).** Never author a `#story` element in the
  StoryInterface — SugarCube provides it; a duplicate is fatal. Preserve the
  single-`#passages` contract.
- **Inline handlers.** The rail uses inline `onclick` because the StoryInterface is
  raw HTML; if the chrome grows, that's the point to move to data-attributes + a
  delegated listener (and to the shell-behavior script).
