# Development

## Prerequisites

- **Tweego** on `PATH` — builds the story.
- **SugarCube 2 story format** in `.storyformats/` — a build dependency, not
  source. Tweego finds it through `TWEEGO_PATH`.
- **Node 22** via `mise` — only for the `[checker]` exit guard.

```sh
mise install
```

Build

From the repo root:

```sh
  export TWEEGO_PATH=.storyformats
  tweego -f sugarcube-2 -m src/css -m src/js -o dist/story.html src
  open dist/story.html
```

Or run a VS Code task from .vscode/tasks.json:

- tweego: build — one-shot build.
- tweego: watch — rebuild on change.
- run: build + open — build and open the story.

dist/ is generated and gitignored. .storyformats/ is also gitignored:
install the SugarCube 2 format there before building.

Source layout

| Path                     | Purpose                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `src/story.twee`         | Story data, `StoryInit`, and the passages.                                         |
| `src/shell.twee`         | `StoryInterface`: the single `#passages` container, shell chrome, and stage slots. |
| `src/title.twee`         | Title screen.                                                                      |
| `src/css/`               | `checker.css` (animated background), `shell.css`, `stage.css`.                     |
| `src/js/`                | Bootstrap scripts: background, pressure level, slot lifecycle, shell actions.      |
| `story.twee-config.yaml` | Macro descriptions for the editor.                                                 |
| `scripts/`               | Manual development checks.                                                         |

Checks

There is no test runner, headless DOM, or browser automation; verification is
manual.

1. Build and open dist/story.html.

2. Click through Title → Start → Node 1 → … → Node 15.

3. Run the bare-link guard:

   ```sh
     node scripts/check-checker-exits.mjs src/story.twee
   ```

   It reports [checker] passages whose text contains [[...]] outside
   <<player_line>> or <<cam_line>>. See
   docs/research/sugarcube-navigation.md §6.

4. Scratch passages are reachable from the browser console:

   ```js
   SugarCube.Engine.play("Levels");
   SugarCube.Engine.play("Stage content");
   SugarCube.Engine.play("Stage content empty");
   ```

5. Outline empty stage slots:

   ```js
   document.body.setAttribute("data-stage-debug", "");
   ```

Authoring

story.twee-config.yaml documents the macros. The content-macro comment in
src/story.twee states the exit convention: a [checker] passage's exits
belong in <<player_line>> (or <<cam_line>>), never as a bare [[...]]
link in passage text.

````

  ### `README.md`

  ```markdown
  # cam-safety

  Development setup, build, and checks: [docs/development.md](docs/development.md).
````

### .gitignore

```gitignore
  # macOS
  .DS_Store

  # Build output (regenerable via the "tweego: build" task in
  # .vscode/tasks.json, or the tweego command in docs/development.md)
  dist/

  # Generated ctags index
  /tags

  # Throwaway prototype
  prototype/

  # Agent tooling cache
  .pi/

  # Local issue-tracker scratch (kept out of the repo)
  .scratch/

  # SugarCube 2 format definition — build dependency (TWEEGO_PATH), not source
  .storyformats/

  # The global gitignore excludes .vscode/; this project's Tweego build
  # task lives there and is tracked (see docs/development.md)
  !.vscode/
  .vscode/*
  !.vscode/tasks.json
```

Then:

```bash
  rm -f src/js/check-checker-exits.mjs
  git add docs/development.md README.md .gitignore
  git commit -m "Document the development toolchain"
  git show --stat HEAD
```
