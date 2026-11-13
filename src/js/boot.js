/* ===== The passage lifecycle: one subscription, two phases =====
   Every per-passage behaviour in this story runs from here rather than
   subscribing to SugarCube's navigation events itself:

     Stage.onPassageStart(fn)   :passagestart   before the passage renders
     Stage.onPassageRender(fn)  :passagerender  after it has rendered

   Why these two and not :passageinit: the slots are written after the
   passage's macros have run, so the render phase is needed anyway, and
   nothing in this story needs a point earlier than the start phase. Both
   are strictly before the passage is displayed, so whatever a handler does
   is in place on the first frame.

   Both phases receive the same context, derived once here:

     passage   the INCOMING passage object (null when unknown)
     tags      its tags as an array (empty when unknown)

   Take the incoming passage from the event, never from State.passage: at
   :passagestart State still names the passage being left.

   No readiness gate and no load-time call. SugarCube runs story JavaScript
   after the StoryInterface is in the DOM and after jQuery is initialised, so
   both are there when this file runs; Engine.start() then navigates to the
   start passage, which fires both phases.

   "Story JavaScript" here means every .js file under src/, which Tweego
   compiles into the story's script section — evaluated once per page load, so
   each subscription below is made once and each handler runs once.

   Do not also pass src/js to Tweego with -m. A module is compiled a second
   time, into <head>, and because these files are already sources of src/ the
   build would then carry two copies of every one of them: two copies of the
   115 KB letter library in the payload, two AudioContexts, and every handler
   running twice per passage. The build compiles src/ alone for that reason
   (.vscode/tasks.json, README); story code does not need to guard against a
   second evaluation, and should not pretend to.

   Load order: Tweego merges src/js in lexical order. This file must stay
   first — it creates Stage, and every registrant calls it at load. */
(function () {
  "use strict";

  /* window.Stage has no declaration for the editor's TypeScript server
     (TS2568), so window is widened for this create-or-keep assignment. */
  var win = /** @type {any} */ (window);
  var Stage = /** @type {any} */ (win.Stage = win.Stage || {});

  var startHandlers = [];
  var renderHandlers = [];

  function passageOf(ev) {
    return (ev && ev.passage) || (ev && ev.detail && ev.detail.passage) || null;
  }

  function run(handlers, ev) {
    var passage = passageOf(ev);
    var ctx = {
      passage: passage,
      tags: (passage && passage.tags) || [],
    };

    for (var i = 0; i < handlers.length; i += 1) {
      handlers[i](ctx);
    }
  }

  Stage.onPassageStart = function (fn) {
    if (typeof fn === "function") {
      startHandlers.push(fn);
    }
  };

  Stage.onPassageRender = function (fn) {
    if (typeof fn === "function") {
      renderHandlers.push(fn);
    }
  };

  jQuery(document).on(":passagestart.stage", function (ev) {
    run(startHandlers, ev);
  });

  jQuery(document).on(":passagerender.stage", function (ev) {
    run(renderHandlers, ev);
  });
})();
