/* ===== Pressure -> level: the story's pressure value selects one of four
   pressure levels (0-3), stored on the document body as data-pressure-level.

   The mapping is a single small pure function, kept pure and minimal so its
   behaviour (0, 1, 2, 3, and out-of-range clamping) is checkable without
   running the story, and extractable to a plain runtime if ever wanted. It is
   1:1 for now; thresholds can be adjusted later in this one place.

   The level is applied on :passageinit — the earliest passage-change point,
   which runs before the passage's content renders — so the stage is already
   in the right layout when content macros run during render. (A passage's own
   <<set $pressure>> therefore takes effect from the next passage on, by
   design.) Mirrors the checker-bg.js / shell.js bootstrap pattern. */
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

  function currentPressure() {
    var sc = window.SugarCube || null;
    if (sc && sc.State && sc.State.variables) {
      return sc.State.variables.pressure;
    }
    return undefined;
  }

  function applyLevel() {
    document.body.setAttribute(
      "data-pressure-level",
      String(pressureToLevel(currentPressure())),
    );
  }

  function apply() {
    applyLevel();

    // Re-derive the level on every passage change, before the passage
    // renders.
    if (window.jQuery) {
      jQuery(document)
        .off(":passageinit.pressurelevel")
        .on(":passageinit.pressurelevel", applyLevel);
    }
  }

  if (window.jQuery && window.SugarCube) {
    apply();
  } else {
    document.addEventListener("DOMContentLoaded", apply);
  }
})();
