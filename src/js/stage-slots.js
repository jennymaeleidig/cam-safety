/* ===== Stage content slots: per-passage lifecycle =====
   The stage's three content slots — Cam's portrait (.stage-cam), Cam's
   speech-bubble (.stage-bubble) and the player's reply bar (.stage-reply) —
   hold content for one passage only. The frame, the background and the menu
   persist; these three do not.

   Cleared on :passageinit — the same earliest passage-change point where
   pressure-level.js applies the level, before the passage renders — so a
   passage that omits a content macro shows an empty slot, never the previous
   passage's content. The macros themselves (registered in StoryInit, see
   story.twee) fill their slot during render, replacing whatever is there.
   Empty slots draw nothing: stage.css gates every per-slot look on :not(:empty).

   Mirrors the checker-bg.js / pressure-level.js / shell.js bootstrap
   pattern. SugarCube bundles jQuery and runs story scripts after it, so the
   binding below needs no fallback path. */
(function () {
  "use strict";

  function clearSlots() {
    var slots = document.querySelectorAll(".stage-slot");
    for (var i = 0; i < slots.length; i += 1) {
      slots[i].textContent = "";
    }
  }

  function apply() {
    if (!window.jQuery) {
      return;
    }

    clearSlots();

    // Clear on every passage change, before the passage renders.
    jQuery(document)
      .off(":passageinit.stageslots")
      .on(":passageinit.stageslots", clearSlots);
  }

  apply();
})();
