/* ===== Stage mode =====
   The story has two display modes, and which one applies is a fact about the
   current passage: a passage tagged [checker] and not [title] renders inside
   the letterboxed stage frame (stage mode); anything else renders in the
   reading shell (shell mode). The title is tagged [title checker] and keeps
   the shell, so the story has a distinct start.

   SugarCube already puts those tags on <body> as classes, and that stays the
   source of truth. The same selector, `body.checker:not(.title)`, was
   restated in eight rules across stage.css and checker.css, so the story's
   central distinction existed only as a copy-paste. This file
   writes the predicate down once and publishes the answer as one attribute;
   the CSS reads the attribute.

   The attribute is valueless — present means stage mode, absent means shell
   mode — matching the existing data-stage-debug affordance.

   Applied on the lifecycle's start phase, like the layout, and for the same
   reason: it must be in place before the passage renders. SugarCube has not
   navigated yet when story JavaScript runs, so <body> carries no passage
   classes at load and the shell shows for the first paint — right for the
   title the story starts on. A story that ever started on a [checker] passage
   would show the shell for one paint before the start phase corrected it. */
(function () {
  "use strict";

  function isStageMode(tags) {
    var list = tags || [];
    return list.includes("checker") && !list.includes("title");
  }

  function applyMode(tags) {
    if (isStageMode(tags)) {
      document.body.setAttribute("data-stage-mode", "");
    } else {
      document.body.removeAttribute("data-stage-mode");
    }
  }

  /* boot.js, which loads before this file, creates window.Stage (see its
     header). */
  var stage = /** @type {any} */ (window).Stage;

  stage.onPassageStart(function (ctx) {
    applyMode(ctx.tags);
  });
})();
