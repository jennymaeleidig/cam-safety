/* ===== Shell behaviour: rail actions =====
   Rail links carry data-shell-action and are dispatched here. SugarCube
   2.37.3 exposes UI / Engine on window.SugarCube only — no bare globals —
   so inline onclick="UI.settings()" throws "UI is not defined". Resolve the
   API at click time instead, which also guarantees it exists by then.

   This file also numbers the menu for its vertical cascade: shell.css reads
   each action's index. */
(function () {
  "use strict";

  /* ---- rail actions -------------------------------------------------- */

  function actions(sc) {
    return {
      settings: function () {
        sc.UI.settings();
      },
      saves: function () {
        sc.UI.saves();
      },
      restart: function () {
        sc.UI.restart();
      },
      back: function () {
        sc.Engine.backward();
      },
      forward: function () {
        sc.Engine.forward();
      },
    };
  }

  function onRailClick(ev) {
    var link =
      ev.target && ev.target.closest
        ? ev.target.closest("[data-shell-action]")
        : null;
    if (!link || !link.closest(".rail")) {
      return;
    }

    var sc = window.SugarCube;
    var run = sc && actions(sc)[link.getAttribute("data-shell-action")];
    if (!run) {
      return;
    }

    ev.preventDefault();
    run();
  }

  document.addEventListener("click", onRailClick);

  /* ---- the menu's vertical cascade ------------------------------------
     The menu is set as upright columns, each hanging below the group's top by
     a whole number of character advances so the labels align by letter: the
     first S of "Saves" sits on "Settings"'s g, and the R of "Restart" sits
     on "Saves"'s e. shell.css states those offsets per column; only the
     advance is measured here.

     The advance is the face's, not a stylesheet number: an upright Latin
     column advances by the font's own vertical metric plus the menu's
     letter-spacing, which differs between fonts and browsers. It is the
     distance between two adjacent letters, read from their ranges (the
     column's own box does not include the letter-spacing past its last
     letter). It is measured again after the face has loaded, because a
     fallback face measures differently; the result is published in em of the
     menu's type, so the cascade follows the panel whenever it scales.

     SugarCube evaluates story JavaScript with the StoryInterface already in
     the DOM (boot.js), but #story is not laid out until the engine has started
     and displayed the first passage, so the rectangles are zero at load. The
     measurement therefore retries on animation frames until it reads a
     positive advance, and again once the face has loaded. */
  (function measureMenuAdvance() {
    var list = /** @type {HTMLElement} */ (
      document.querySelector(".rail-actions")
    );
    if (!list) {
      return;
    }
    var first = list.querySelector("a");
    var text = first && first.firstChild;
    if (!text || text.nodeType !== 3 || !text.nodeValue) {
      return;
    }

    /* One letter's top, by range: the rect of a single character. */
    function topAt(index) {
      var range = document.createRange();
      range.setStart(/** @type {Text} */ (text), index);
      range.setEnd(/** @type {Text} */ (text), index + 1);
      return range.getBoundingClientRect().top;
    }

    /* Publish one advance in em of the menu's type. Returns false while the
       rail has no layout yet, so the caller can try again. */
    function setAdvance() {
      var count = String(text.nodeValue).length;
      if (count < 2) {
        return false;
      }
      var fontSize = parseFloat(window.getComputedStyle(first).fontSize);
      var advance = (topAt(count - 1) - topAt(0)) / (count - 1);
      if (!fontSize || !Number.isFinite(advance) || advance <= 0) {
        return false;
      }
      list.style.setProperty(
        "--rail-menu-advance",
        String(advance / fontSize),
      );
      return true;
    }

    /* The menu's type must be measured in the face it is set in, not in the
       fallback the browser draws while the face loads: the two advance
       differently, and a measurement taken during the swap would misalign
       every column. The face is requested explicitly for that reason, so a
       menu that is hidden at load still has it ready by the time it shows. */
    var face = document.fonts;
    var family = window.getComputedStyle(first).fontFamily;

    function faceReady() {
      if (!face || typeof face.check !== "function") {
        return true;
      }
      return face.check("16px " + family);
    }

    /* The first laid-out frame in the loaded face is the measurement; the cap
       keeps a menu that is hidden in the current layout (the stage hides it in
       layout 3) from polling forever. */
    var triesLeft = 250;
    function measureWhenReady() {
      if (faceReady() && setAdvance()) {
        return;
      }
      if (triesLeft <= 0) {
        return;
      }
      triesLeft -= 1;
      window.setTimeout(measureWhenReady, 16);
    }

    measureWhenReady();
    if (face && typeof face.load === "function") {
      face.load("16px " + family).then(measureWhenReady, measureWhenReady);
    }
  })();
})();
