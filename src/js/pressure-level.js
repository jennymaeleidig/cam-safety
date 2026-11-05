/* ===== Pressure -> level =====
   The story's pressure value selects one of four pressure levels (0-3),
   stored on the document body as data-pressure-level. stage.css holds each
   level's slot geometry under that attribute; checker.css holds each level's
   background values under it too. This file is the only place the pressure
   value becomes a level.

   The mapping is a single small pure function, kept pure and minimal so its
   behaviour (0, 1, 2, 3, and out-of-range clamping) is checkable without
   running the story.

   Applied on the lifecycle's start phase — before the passage renders — so
   the stage is already in the right layout when the content macros run.
   (A passage's own <<set $pressure>> therefore takes effect from the next
   passage on, by design.) */
(function () {
  "use strict";

  function pressureToLevel(pressure) {
    // 1:1 for now, clamped to the four levels the stage defines.
    var p = Number(pressure);
    if (!isFinite(p)) {
      p = 0;
    }
    return Math.min(3, Math.max(0, Math.round(p)));
  }

  function applyLevel(ctx) {
    document.body.setAttribute(
      "data-pressure-level",
      String(pressureToLevel(ctx.pressure)),
    );
  }

  window.Stage.onPassageStart(applyLevel);
})();
