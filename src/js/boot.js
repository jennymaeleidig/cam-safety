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
     pressure  State.variables.pressure as-is (may be undefined)

   Take the incoming passage from the event, never from State.passage: at
   :passagestart State still names the passage being left.

   No readiness gate and no load-time call. SugarCube runs story JavaScript
   (src/js, via Tweego's -m) after the StoryInterface is in the DOM and
   after jQuery is initialised, so both are there when this file runs;
   Engine.start() then navigates to the start passage, which fires both
   phases. Story JavaScript is evaluated once per page load, so the
   subscription needs no matching unsubscribe.

   Load order: Tweego merges src/js in lexical order. This file must stay
   first — it creates Stage, and every registrant calls it at load. */
(function () {
  "use strict";

  var Stage = (window.Stage = window.Stage || {});

  var startHandlers = [];
  var renderHandlers = [];

  function currentPressure() {
    var sc = window.SugarCube;
    if (sc && sc.State && sc.State.variables) {
      return sc.State.variables.pressure;
    }
    return undefined;
  }

  function passageOf(ev) {
    return (ev && ev.passage) || (ev && ev.detail && ev.detail.passage) || null;
  }

  function run(handlers, ev) {
    var passage = passageOf(ev);
    var ctx = {
      passage: passage,
      tags: (passage && passage.tags) || [],
      pressure: currentPressure(),
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
