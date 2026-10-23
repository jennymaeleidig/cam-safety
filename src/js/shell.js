/* ===== Shell behavior: rail chrome + rail-title visibility =====
   Two jobs, both impossible in the raw StoryInterface markup:

   1. Rail actions. Rail links carry data-shell-action and are dispatched
      here. SugarCube 2.37.3 exposes UI / Engine on window.SugarCube only —
      no bare globals — so inline onclick="UI.settings()" throws
      "UI is not defined". Resolve the API at click time instead, which also
      guarantees it exists by then.

   2. Tag-driven rail title (not hardwired to a passage name):
        passage tagged [title]  ->  rail title HIDDEN (that screen shows the
                                    big title, so the rail's would duplicate it)
        any other passage       ->  rail title SHOWN
      Mirrors the checker-bg.js bootstrap pattern. */
(function () {
  "use strict";

  function api() {
    return window.SugarCube || null;
  }

  /* ---- rail title visibility ------------------------------------------- */

  function isTitlePassage() {
    var sc = api();
    if (!sc || !sc.State || !sc.Story) {
      return false;
    }
    var passage = sc.Story.get(sc.State.passage);
    var tags = passage && passage.tags;
    return Array.isArray(tags) && tags.indexOf("title") !== -1;
  }

  function toggleRailTitle() {
    var railTitle = document.querySelector(".rail-title");
    if (railTitle) {
      railTitle.style.display = isTitlePassage() ? "none" : "";
    }
  }

  /* ---- rail actions ---------------------------------------------------- */

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
    var link = ev.target && ev.target.closest
      ? ev.target.closest("[data-shell-action]")
      : null;
    if (!link || !link.closest(".rail")) {
      return;
    }

    var sc = api();
    var run = sc && actions(sc)[link.getAttribute("data-shell-action")];
    if (!run) {
      return;
    }

    ev.preventDefault();
    run();
  }

  /* ---- bootstrap ------------------------------------------------------- */

  function apply() {
    toggleRailTitle();

    document.addEventListener("click", onRailClick);

    // Re-derive on every passage change.
    if (window.jQuery) {
      jQuery(document)
        .off(":passageinit.shelltitle")
        .on(":passageinit.shelltitle", toggleRailTitle);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
