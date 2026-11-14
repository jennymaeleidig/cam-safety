/* ===== The menu's vertical cascade: measure one character advance =====
   The menu is set as upright columns, each hanging below the group's top by a
   whole number of character advances so the labels align by letter: the first
   S of "Saves" sits on "Settings"'s g, and the R of "Restart" sits on
   "Saves"'s e. shell.css states those offsets per column; this file measures
   the one advance they are counted in.

   The advance is the face's, not a stylesheet number: an upright Latin column
   advances by the font's own vertical metric plus the menu's letter-spacing,
   which differs between fonts and browsers. It is the distance between two
   adjacent letters, read from their ranges (the column's own box does not
   include the letter-spacing past its last letter). It is measured again after
   the face has loaded, because a fallback face measures differently; the
   result is published in em of the menu's type, so the cascade follows the
   panel whenever it scales.

   SugarCube evaluates story JavaScript with the StoryInterface already in the
   DOM (boot.js), but #story is not laid out until the engine has started and
   displayed the first passage, so the rectangles are zero at load. The
   measurement therefore retries until it reads a positive advance, and again
   once the face has loaded.

   MenuAdvance.measure() resolves with the advance in em, or null when the
   menu is never laid out (a layout that hides it). The load-time call starts
   the measurement; the console can ask for the number instead of waiting on a
   custom property. */
(function () {
  "use strict";

  var win = /** @type {any} */ (window);
  var MenuAdvance = /** @type {any} */ (win.MenuAdvance = win.MenuAdvance || {});

  var MAX_TRIES = 250;
  var RETRY_MS = 16;
  /* The Earthbound face at the menu's letter-spacing, in em of the menu's
     type. Seeded before the first measurement so a Menu that is never laid
     out still hangs by whole letters. */
  var FALLBACK_ADVANCE = 1.3083;

  /* The last measured advance, in em of the menu's type; null until measured. */
  MenuAdvance.advance = null;

  MenuAdvance.measure = function () {
    var list = /** @type {HTMLElement} */ (
      document.querySelector(".rail-actions")
    );
    if (!list) {
      return Promise.resolve(null);
    }
    list.style.setProperty("--rail-menu-advance", String(FALLBACK_ADVANCE));
    var first = list.querySelector("a");
    var text = first && first.firstChild;
    if (!text || text.nodeType !== 3 || !text.nodeValue) {
      return Promise.resolve(null);
    }

    /* One letter's top, by range: the rect of a single character. */
    function topAt(index) {
      var range = document.createRange();
      range.setStart(/** @type {Text} */ (text), index);
      range.setEnd(/** @type {Text} */ (text), index + 1);
      return range.getBoundingClientRect().top;
    }

    /* Publish one advance in em of the menu's type. Returns null while the
       rail has no layout yet. */
    function setAdvance() {
      var count = String(text.nodeValue).length;
      if (count < 2) {
        return null;
      }
      var fontSize = parseFloat(window.getComputedStyle(first).fontSize);
      var advance = (topAt(count - 1) - topAt(0)) / (count - 1);
      if (!fontSize || !Number.isFinite(advance) || advance <= 0) {
        return null;
      }
      var em = advance / fontSize;
      MenuAdvance.advance = em;
      list.style.setProperty("--rail-menu-advance", String(em));
      return em;
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

    return new Promise(function (resolve) {
      var done = false;
      var triesLeft = MAX_TRIES;

      function finish(value) {
        if (!done) {
          done = true;
          resolve(value);
        }
      }

      /* The first laid-out frame in the loaded face is the measurement; the
         cap keeps a menu that is hidden in the current layout from polling
         forever. */
      function attempt() {
        if (done) {
          return;
        }
        if (faceReady()) {
          var advance = setAdvance();
          if (advance != null) {
            finish(advance);
            return;
          }
        }
        if (triesLeft <= 0) {
          finish(null);
          return;
        }
        triesLeft -= 1;
        window.setTimeout(attempt, RETRY_MS);
      }

      attempt();
      if (face && typeof face.load === "function") {
        face.load("16px " + family).then(attempt, attempt);
      }
    });
  };

  MenuAdvance.measure();
})();
