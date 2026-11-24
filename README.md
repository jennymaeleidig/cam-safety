# Cam Safety

## Build

[Twine](https://twinery.org/) stories compile with [Tweego](https://github.com/tmedwards/tweego)
on `PATH`, and use the [SugarCube 2](https://www.motoslave.net/sugarcube/2/) story
format in `.storyformats/`. Copy
the assets beside the story, then compile `src/`:

```sh
mkdir -p dist/images dist/fonts dist/music
cp -R include/images/. dist/images/
cp -R include/fonts/. dist/fonts/
cp -R include/music/. dist/music/
TWEEGO_PATH=.storyformats tweego -f sugarcube-2 -o dist/story.html src
```

`.vscode/tasks.json` runs the same steps as `assets: copy`, `tweego: build`,
`tweego: watch` and `run: build + open`. Pass `src/` alone: adding `src/js` or
`src/css` with `-m` compiles those files a second time.

`mise install` provisions the language servers and ESLint that pi-lens runs
over `src/`; the build itself needs only Tweego. `mise run lint` lints
`src/js/` with the rules in `eslint.config.mjs`.

## Formatting

Prettier owns the whitespace and line breaks in every file it can parse:
`src/js/`, `src/css/`, the Markdown and JSON, and the configs at the root. Its
settings live in `.prettierrc` and its exclusions in `.prettierignore`; `.twee`
is not Prettier's and is never rewritten. `npm install` pulls Prettier, Husky
and lint-staged into `node_modules/`; `mise run format` rewrites the tree and
`npm run format:check` reports what would change without writing.

Husky points the repository's hooks at `.husky/`. Its `pre-commit` hook hands
the staged files to lint-staged, which runs Prettier on each format it handles
and stages the result, so a commit carries the formatted text. Unrelated
working-tree edits are left as they were. Bypass the hook with `git commit
--no-verify`.

## Docs

- `docs/authoring.md`: passages, the content macros, the layouts.
- `docs/verification.md`: the manual checklist for a build.

## Source

`src/*.twee` holds StoryData, StoryInit, the macros and the passages;
`src/js/` the story JavaScript; `src/css/` the styling. `include/` holds the
artwork, fonts and music that the build copies into `dist/`.
