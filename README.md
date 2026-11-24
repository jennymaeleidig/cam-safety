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

## Docs

- `docs/authoring.md`: passages, the content macros, the layouts.
- `docs/verification.md`: the manual checklist for a build.

## Source

`src/*.twee` holds StoryData, StoryInit, the macros and the passages;
`src/js/` the story JavaScript; `src/css/` the styling. `include/` holds the
artwork, fonts and music that the build copies into `dist/`.
