/* ===== Layout =====
   The story's running value is its layout: one of four fixed framed
   compositions, 0-3, stored in $layout and published on the document body as
   data-layout. stage.css holds each layout's slot geometry under that
   attribute; checker.css holds each layout's background values under it too.
   This file is the only writer of the attribute, and the only place the
   running value is normalised.

   Everything else reads the published seam and never recomputes a layout:
   stage.js reads data-layout for Cam's neutral pose, and the stylesheets key
   their per-layout blocks on body[data-layout="N"]. The <<set_layout>> macro
   (story.twee) and the lifecycle's start phase both delegate here, so there
   is one writer rather than one per entry point.

   Normalisation is the whole rule: a non-finite value (including a missing
   $layout, as in an old save) becomes 0; a finite value is rounded and
   clamped to 0-3. That keeps a corrupt value from breaking the stage and
   makes Layout 0 the fallback before anything has been published.

   Applied on the lifecycle's start phase — before the passage renders — so
   the saved/restored layout is already published when content arrives. A
   passage's own <<set_layout>> then publishes its value while the passage
   renders, in the same task and before it is displayed, so its first visible
   frame is the new layout. There is no deferred write and no intermediate
   composition. (A direct <<set $layout>> therefore takes effect from the
   next passage on, by design: use <<set_layout>> to choose the composition of
   the passage that writes it.) */
(function () {
  "use strict";

  var LAST = 3;

  function normalise(value) {
    var n = Number(value);
    if (!isFinite(n)) {
      n = 0;
    }
    return Math.min(LAST, Math.max(0, Math.round(n)));
  }

  /* boot.js, which loads before this file, creates window.Stage (see its
     header). The editor's TypeScript server has no declarations for these
     story globals, so window is widened for them. */
  var win = /** @type {any} */ (window);
  var stage = win.Stage;

  var Layout = {};

  /* Publish a layout. Writes $layout (normalised) and body[data-layout]
     synchronously; returns the value that was published. */
  Layout.set = function (value) {
    var layout = normalise(value);
    var sc = window.SugarCube;
    if (sc && sc.State && sc.State.variables) {
      sc.State.variables.layout = layout;
    }
    document.body.setAttribute("data-layout", String(layout));
    return layout;
  };

  win.Layout = Layout;

  stage.onPassageStart(function (ctx) {
    Layout.set(ctx.layout);
  });
})();
