# Navigation and links outside `#passages` — SugarCube 2.37.3

Sources: official docs (`https://www.motoslave.net/sugarcube/2/docs/#<anchor>`) and
`repo@v2.37.3: <path>` (github.com/tmedwards/sugarcube-2, tag v2.37.3).

## 1. The error, and the correct call

`Engine.play(passageTitle [, noHistory])` takes a **title string**, not a Passage
object (docs `#engine-api-method-play`). The source parameter is literally named
`title`; it runs `Config.navigation.override`, then `Story.get(passageTitle)`
(`repo@v2.37.3: src/engine.js`, `enginePlay()`).

`Story.get(name)` documents `name` as a string (docs `#story-api-method-get`), and
its implementation accepts only `number`/`string`; `object` falls through to
`throw new TypeError(\`Story.get() name parameter cannot be ${type}\`)`
(`repo@v2.37.3: src/story.js`, `get()`). So:

- `SugarCube.Engine.play("Stage content")` — correct; returns the new passage
  element, or `false` while the engine state is `init`.
- `SugarCube.Engine.play(SugarCube.Story.get("Stage content"))` — always throws the
  observed error: `Engine.play` passes the Passage object to `Story.get`, which
  rejects objects. It is not a missing-options problem.

There is no options object in 2.37.3; the second parameter is the boolean
`noHistory` (docs `#engine-api-method-play`).

## 2. Legitimate programmatic navigation

- `Engine.play(title)` — adds a history moment and renders; `Engine.play(title, true)`
  renders without a new moment (docs `#engine-api-method-play`).
- `Engine.goTo(index)`, `Engine.go(offset)`, `Engine.backward()`, `Engine.forward()`,
  `Engine.show()` — all route through `enginePlay`/`State` (`src/engine.js`).
- `State.passage` is a read-only getter for the active moment's title
  (docs `#state-api-getter-passage`; `src/state.js`, `momentActiveTitle`).
- `UI.jumpto()` is **deprecated** in 2.37.0 (docs `#ui-api-method-jumpto`); do not use it.

## 3. Do links outside `#passages` work?

Yes. Link handling is **bound per link element at wikification time**, not delegated
from `#passages`. `Wikifier.createInternalLink()` attaches `$link.ariaClick(...)`,
and that handler calls `Engine.play(passage)` (docs `#methods-jquery-prototype-method-ariaclick`
notes SugarCube uses `ariaClick` "internally to handle all of its various link markup
and macros"; `repo@v2.37.3: src/markup/wikifier.js`, `createInternalLink`; setter links
pass their setter as the callback, `src/markup/parserlib.js`, `link` parser).

`<<link>>` does the same: `$link.ariaClick({namespace:'.macros', one: passage != null}, …)`
then `Engine.play(passage)` (`repo@v2.37.3: src/macro/macros/button-link.js`).
`<<click>>` was removed; `<<choice>>` still exists but is deprecated and records
`$['#choice'][State.passage]` (`src/macro/deprecated-macros.js`; docs
`#guide-code-updates-2.37.0`). Consequently, inside a reply slot:

- setters, `<<link>>`, visited-link classes (`Config.addVisitedLinkClass`,
  `wikifier.js`), and history all behave normally;
- body tag classes are applied by `enginePlay` from the incoming `Passage`, not from
  the clicked element (`src/engine.js`), so `[checker]`/`[title]` gating still updates;
- `Engine.backward()/forward()` re-render the passage, so content macros re-run and
  the slots refill.

## 4. Caveats for `$(el).wiki(text)`

`<jQuery>.wiki()` wikifies into a fragment and appends it to **any** target; no
`#passages` dependency is documented or implemented (docs
`#methods-jquery-prototype-method-wiki`; `repo@v2.37.3: src/extensions/jquery/wiki-plugin.js`).
Real caveats:

- The engine's final `tabindex` pass over `#story` runs **after** `:passagerender`
  (`src/engine.js`), so content written at `:passagerender` still receives a
  tabindex; content added at `:passageend` or later misses it. This repo writes the
  stage slots from a `:passagerender` handler (`src/js/stage.js`), which is inside
  that window.
- `State.create()` happens **after** `:passageinit` (`src/engine.js`), so anything
  wikified in `:passageinit` sees the _previous_ `State.passage`. During render the
  state is current. This repo's lifecycle (`src/js/boot.js`) subscribes one event
  later, at `:passagestart`, for the same reason and passes the incoming passage
  through its context rather than reading `State.passage`.
- `:passagerender`'s `detail.content` is only the passage element (docs
  `#events-navigation-event-passagerender`), so handlers expecting slot content there
  will not find it.
- Errors in wikified text throw rather than rendering inline (docs
  `#methods-jquery-prototype-method-wiki`), so a bad reply link fails loudly.

## 5. Supported ways to show choices outside `#passages`

SugarCube has **no first-class "choices outside `#passages`" feature**. The only
documented StoryInterface hook for a region outside `#passages` is the
`data-passage` / `data-init-passage` attribute: the element is filled from a named
passage on each `:uiupdate` (docs `#code-passage-storyinterface`; `src/engine.js`
binds a `:uiupdate` handler per element and reads the attribute once, at init).
Options:

| Option                                                                        | Trade-offs                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<<player_line "… [[Next->X]]">>` via `$(slot).wiki()` (current scratch pair) | Works today; per-element handlers. Engine enforces nothing: every `[checker]` passage must put its exits in a content macro.                                                                                      |
| `data-passage` on `.stage-reply`, e.g. `data-passage="Player replies"`        | Engine-managed, refreshes each navigation at `:uiupdate` — which runs _after_ macros, so it would overwrite `<<player_line>>`. Attribute is fixed at init, so one passage must branch on `State.passage`/`$vars`. |
| Keep `#passages` visible and CSS-position it over the reply slot              | No engine support needed; the docs only require the element to exist. But passage prose lands there too, so `[checker]` passages become link-only, and `.shell { display:none }` must become positioning.         |
| `<<link>>` into the slot instead of `[[…]]`                                   | Same handler; useful for block content or scripted links, otherwise no gain. Avoid `<<choice>>` (deprecated).                                                                                                     |

**Unverified:** none of the above was inferred; every behaviour cited was read from
the 2.37.3 source or the official docs. I did not test in a built story.

## Recommendation for this repo

Keep the macro surface (`<<cam_line>>` / `<<player_line>>` / `<<portrait>>`) as the
single visible content path for `[checker]` passages, and treat `#passages` as
engine state that is intentionally invisible. Make the convention explicit:

1. Fix any doc/comment that still shows `Engine.play(Story.get(...))`; use
   `SugarCube.Engine.play("Stage content")`.
2. State in `story.twee`'s content-macro comment that every `[checker]` passage's
   exits belong in `<<player_line>>` (or `<<cam_line>>`), since its own links render
   into hidden `#passages`.
3. Nothing automated enforces this. The textual guard that did is gone (section 6);
   verification is the manual pass in README's Verification section.
4. Only if engine-managed refresh is wanted later, adopt `data-passage` on
   `.stage-reply` and drop `<<player_line>>` for that slot — do not run both.

## 6. The `[checker]` exit rule, and the guard that enforced it

Stage mode hides a `[checker]` passage's own `#passages` content, so a bare
`[[link]]` there is invisible to the player. Every exit must be rendered by
`<<player_line>>` (the reply bar) or `<<cam_line>>` (the speech-bubble), which
fill stage slots during render. Nothing in SugarCube reports a violation.

A guard script (`check-checker-exits.mjs`, ~190 lines, no dependencies) scanned
`src/story.twee` textually and exited 1 on offenders. It was removed: it was a
hand-rolled approximation of twee semantics (a passage-header regex plus a
quote-aware scanner for `<<…>>`), its own `CONTENT_MACROS` set had drifted from
`story.twee` (it never learned `portrait`), and it was never wired into the
build. The rule now lives as the comment on `StoryInit` in `src/story.twee`.
