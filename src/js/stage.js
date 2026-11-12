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

   Whether a slot is filled is decided here, in the same pass that writes it,
   and published as data-state on the slot; stage.css gates every per-slot
   look on that attribute. Never let CSS infer it from :empty: a line of wiki
   output that renders to whitespace leaves a slot non-empty and blank, and
   only this file knows the difference. */
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

  /* Publish whether the slot has content. This is the one place that knows:
     the record says what the passage asked for, and the write below says what
     actually landed. stage.css reads the attribute and never guesses from
     :empty, which whitespace-only wiki output defeats. */
  function setState(slot, filled) {
    slot.setAttribute("data-state", filled ? "filled" : "empty");
  }

  function writePortrait(value) {
    var slot = slotElement("cam");
    if (!slot) {
      return;
    }
    slot.textContent = "";
    if (!value || !value.src) {
      setState(slot, false);
      writeHand(null);
      return;
    }
    var img = document.createElement("img");
    img.className = "stage-portrait";
    img.setAttribute("src", String(value.src));
    img.setAttribute("alt", String(value.alt || "Cam"));
    slot.appendChild(img);
    setState(slot, true);
    /* A pose drawn in two layers lifts its hand out here; every other pose has
       none, and this clears whatever the last passage left. */
    writeHand(HAND_LAYER[String(value.src)] || null);
  }

  /* ---- the hand layer: poses drawn in two halves ------------------------
     Phase 2's neutral pose is a body and a hand on the same canvas, split so
     the hand can rest on the menu while the body stays behind it: in that
     composition the menu rises across the portrait, and a gesture buried
     behind the panel would be gone.

     The table is the authority, not a path convention — a pose with one file
     stays one file, and giving a pose a hand is an entry here rather than a
     guess at a filename, where a missing asset would fail silently. Keyed by
     the pose the story asked for, so <<portrait>> keeps naming one image and
     the stage decides what that image is made of.

     The layer is outside .stage (see .stage-cam-hand, stage.css) because a
     fixed box is a stacking context: a slot inside the frame could never
     reach the menu. Only the image goes in — no backdrop, so the menu shows
     through the hand's transparent pixels, and no frame, which belongs to the
     picture and stays with the body below the menu. */
  var HAND_LAYER = {
    "images/cam/phase-2/neutral/phase-2-neutral.gif":
      "images/cam/phase-2/neutral/phase-2-neutral-hand.gif",
  };

  function writeHand(src) {
    var layer = document.querySelector(".stage-cam-hand");
    if (!layer) {
      return;
    }
    layer.textContent = "";
    if (!src) {
      return;
    }
    var img = document.createElement("img");
    img.className = "stage-hand";
    img.setAttribute("src", String(src));
    /* Decorative: the body image already names Cam, so a second alt would
       announce the same portrait twice. */
    img.setAttribute("alt", "");
    layer.appendChild(img);
  }

  function writeLine(name, html) {
    var slot = slotElement(name);
    if (!slot) {
      return;
    }
    slot.textContent = "";
    if (html == null || html === "") {
      setState(slot, false);
      return;
    }
    jQuery(slot).wiki(String(html));
    setState(slot, true);
  }

  /* ---- the default portrait: the level's neutral pose -------------------
     Cam's artwork is one GIF per phase, in a neutral and a talking pose.
     A [checker] passage that omits <<portrait>> shows the current level's
     neutral pose, so Cam is on stage without any per-passage wiring;
     <<portrait>> overrides it for that one passage (a talking pose, a
     one-off image).

     Paths are relative to the built story.html: the build copies
     include/images beside it as dist/images (the assets: copy task).

     The level is read from the body attribute pressure-level.js owns, never
     recomputed here — that file is the only place pressure becomes a level.
     It is already set when the flush runs, since start handlers run before
     render handlers. */
  var NEUTRAL_POSE = [
    "images/cam/phase-0/neutral/phase-0-neutral.gif",
    "images/cam/phase-1/neutral/phase-1-neutral.gif",
    "images/cam/phase-2/neutral/phase-2-neutral.gif",
    "images/cam/phase-3/neutral/phase-3-neutral.gif",
  ];

  function neutralPose() {
    var level = Number(document.body.getAttribute("data-pressure-level"));
    return NEUTRAL_POSE[level] || NEUTRAL_POSE[0];
  }

  /* ---- the two phases ------------------------------------------------- */

  function reset() {
    record = emptyRecord();
  }

  function flush() {
    writePortrait(record.cam || { src: neutralPose() });
    writeLine("bubble", record.bubble);
    writeLine("reply", record.reply);
  }

  /* ---- the interface: content, not slots ------------------------------
     Callers name content (Cam's line, the player's line, the portrait); the
     slot names stay in this file, apart from the markup contract they share
     with shell.twee's data-stage-slot attributes. An omitted alt falls back
     to "Cam" here so the macros stay pass-through. */

  /* boot.js, which loads before this file, creates window.Stage; the editor's
     TypeScript server has no declaration for it (TS2568), so window is
     widened for this one read. */
  var stage = (/** @type {any} */ (window)).Stage;

  stage.setCamLine = function (html) {
    record.bubble = html;
  };

  stage.setPlayerLine = function (html) {
    record.reply = html;
  };

  stage.setPortrait = function (src, alt) {
    record.cam = { src: src, alt: alt };
  };

  stage.onPassageStart(reset);
  stage.onPassageRender(flush);
})();
