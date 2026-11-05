/* ===== The stage's content slots =====
   Three slots hold one passage's content: Cam's portrait (.stage-cam), Cam's
   speech-bubble (.stage-bubble) and the player's reply bar (.stage-reply).
   The frame, the background and the menu persist; these three do not.

   One writer. The content macros (registered in StoryInit, story.twee)
   record their content here while the passage renders; the record is reset
   when a passage starts and written into all three slots in one flush after
   the render. A passage that omits a macro therefore shows an empty slot
   because the flush wrote nothing there — never because something cleared it
   first.

   The flush runs at :passagerender, after every macro has run. Three facts
   about that moment:
     - the passage element is still detached, and #passages still holds the
       OUTGOING passage: read content from the record, never from the DOM;
     - jQuery.wiki() output is live on a detached element — SugarCube binds
       link handling per anchor at parse time — so it is safe here;
     - so the flush lands in the same task as the passage swap; nothing
       flashes. The engine's final tabindex sweep over #story runs after
       :passagerender, so links written here are still swept.

   Never cache a rendered slot node: SugarCube's link handlers are one-shot,
   so a re-shown link must be re-wikified. Never put a data-passage attribute
   on a slot: UI.update() re-renders those during :uiupdate, emptying them.

   Empty slots draw nothing — stage.css gates every per-slot look on
   :not(:empty). */
(function () {
  "use strict";

  // Created by boot.js, which loads first; this file only adds members.

  /* ---- the record: one passage's content ------------------------------ */

  function emptyRecord() {
    return { cam: null, bubble: null, reply: null };
  }

  var record = emptyRecord();

  /* ---- writers: one per slot, each clearing before it fills ----------- */

  function slotElement(name) {
    return document.querySelector(
      '.stage-slot[data-stage-slot="' + name + '"]',
    );
  }

  function writePortrait(value) {
    var slot = slotElement("cam");
    if (!slot) {
      return;
    }
    slot.textContent = "";
    if (!value || !value.src) {
      return;
    }
    var img = document.createElement("img");
    img.className = "stage-portrait";
    img.setAttribute("src", String(value.src));
    img.setAttribute("alt", String(value.alt || "Cam"));
    slot.appendChild(img);
  }

  function writeLine(name, html) {
    var slot = slotElement(name);
    if (!slot) {
      return;
    }
    slot.textContent = "";
    if (html == null || html === "") {
      return;
    }
    jQuery(slot).wiki(String(html));
  }

  /* ---- the two phases ------------------------------------------------- */

  function reset() {
    record = emptyRecord();
  }

  function flush() {
    writePortrait(record.cam);
    writeLine("bubble", record.bubble);
    writeLine("reply", record.reply);
  }

  /* ---- the interface: content, not slots ------------------------------
     Callers name content (Cam's line, the player's line, the portrait); the
     slot names stay in this file, apart from the markup contract they share
     with shell.twee's data-stage-slot attributes. An omitted alt falls back
     to "Cam" here so the macros stay pass-through. */

  window.Stage.setCamLine = function (html) {
    record.bubble = html;
  };

  window.Stage.setPlayerLine = function (html) {
    record.reply = html;
  };

  window.Stage.setPortrait = function (src, alt) {
    record.cam = { src: src, alt: alt };
  };

  window.Stage.onPassageStart(reset);
  window.Stage.onPassageRender(flush);
})();
