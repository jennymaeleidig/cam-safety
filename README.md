# Cam Safety

## Build

Tweego on `PATH`, and the SugarCube 2 story format in `.storyformats/`. Copy
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

`npm install` adds the language servers pi-lens runs over `src/`; the build
itself needs only Tweego.

## Docs

- `docs/authoring.md`: passages, the content macros, the layouts.
- `docs/verification.md`: the manual checklist for a build.

## Source

`src/*.twee` holds StoryData, StoryInit, the macros and the passages;
`src/js/` the story JavaScript; `src/css/` the styling. `include/` holds the
artwork, fonts and music that the build copies into `dist/`.
