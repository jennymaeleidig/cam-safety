/* ===== Shell behavior: rail-title visibility (tag-driven) =====
   Contract — tag-driven, not hardwired to a passage name:
     passage tagged [title]  ->  rail title HIDDEN (that screen shows the
                                 big title, so the rail's would duplicate it)
     any other passage       ->  rail title SHOWN
   The StoryInterface is raw HTML and cannot express this toggle, so it
   lives here. Mirrors the checker-bg.js bootstrap pattern. */
(function () {
  "use strict";

  function isTitlePassage() {
    var passage =
      window.State && window.Story && Story.get(State.passage);
    var tags = passage && passage.tags;
    return Array.isArray(tags) && tags.indexOf("title") !== -1;
  }

  function toggleRailTitle() {
    var railTitle = document.querySelector(".rail-title");
    if (railTitle) {
      railTitle.style.display = isTitlePassage() ? "none" : "";
    }
  }

  function apply() {
    toggleRailTitle();

    // Re-derive on every passage change.
    if (window.jQuery) {
      jQuery(document)
        .off(":passageinit.shelltitle")
        .on(":passageinit.shelltitle", toggleRailTitle);
    }
  }

  if (window.jQuery && window.State) {
    apply();
  } else {
    document.addEventListener("DOMContentLoaded", apply);
  }
})();
