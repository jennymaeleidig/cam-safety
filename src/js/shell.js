/* ===== Shell behaviour: rail actions =====
   Rail links carry data-shell-action and are dispatched here. SugarCube
   2.37.3 exposes UI / Engine on window.SugarCube only — no bare globals —
   so inline onclick="UI.settings()" throws "UI is not defined". Resolve the
   API at click time instead, which also guarantees it exists by then.

   The Menu's vertical cascade is measured in menu-advance.js. */
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
})();
