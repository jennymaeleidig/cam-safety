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
   output that renders to whitespace leaves a slot non-empty yet drawing
   nothing, and only this file knows the difference.

   The visible state has one writer: this file. The flush publishes data-state
   and records what it gave each slot; is-revealing and inert are written only
   by the transitions the reveal requests. reveal marks Cam's growing line as
   revealing while keeping the flushed paper, hold marks a waiting reply as
   revealing and inert while keeping the flushed bar — its prose is already
   empty — land publishes a slot filled and reachable, and abandon puts back
   the state the most recent flush gave that slot. The flush records that state
   here, so abandoning a line that a newer flush has already replaced cannot
   clobber the newer state. A passage start clears the record, so an abandon
   can never restore state from a passage before a failed or absent flush. */
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

  /* ---- the slot's visible state ---------------------------------------
     data-state, is-revealing and inert are written nowhere else. Two kinds of
     write:
       publish   the flush's write, which also records what the slot was
                 given (lastFlush) so abandon can restore it;
       setState  a transition requested by the reveal, which never changes
                 that record.
     stage.css reads data-state and never guesses from :empty, which
     whitespace-only wiki output defeats. */
  var lastFlush = new WeakMap();
  var slotByProse = new WeakMap();

  function setState(slot, filled) {
    slot.setAttribute("data-state", filled ? "filled" : "empty");
  }

  function publish(slot, filled) {
    lastFlush.set(slot, filled);
    setState(slot, filled);
  }

  /* A prose handle (the bubble's inner box, or the reply slot itself) maps to
     the slot whose state it shares; created in writeLine and kept after the
     slot is rewritten, so an old line can still be abandoned safely. */
  function slotOf(handle) {
    return (handle && slotByProse.get(handle)) || null;
  }

  function writePortrait(value) {
    var slot = slotElement("cam");
    if (!slot) {
      return;
    }
    slot.textContent = "";
    if (!value || !value.src) {
      publish(slot, false);
      writeHand(null);
      return;
    }
    var img = document.createElement("img");
    img.className = "stage-portrait";
    img.setAttribute("src", String(value.src));
    img.setAttribute("alt", String(value.alt || "Cam"));
    slot.appendChild(img);
    publish(slot, true);
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

  /* Returns the prose handle the reveal must grow, so the flush can hand
     camLine and reply to it in one call; null when there was nothing to
     write.

     The bubble owns two layers inside its one slot: the paper is a ::before
     on .stage-bubble (stage.css) and the line goes into an inner
     .stage-bubble-prose box, so the paper stays fixed to the slot while a
     long line scrolls and never lands on its outline. Every other slot is a
     single element whose own box scrolls; the reply's prose handle is the
     slot itself. */
  function writeLine(name, html) {
    var slot = slotElement(name);
    if (!slot) {
      return null;
    }
    slot.textContent = "";
    if (html == null || html === "") {
      publish(slot, false);
      return null;
    }
    var target = slot;
    if (name === "bubble") {
      target = document.createElement("div");
      target.className = "stage-bubble-prose";
      slot.appendChild(target);
    }
    jQuery(target).wiki(String(html));
    publish(slot, true);
    slotByProse.set(target, slot);
    return target;
  }

  /* ---- the default portrait: the layout's neutral pose ------------------
     Cam's artwork is one GIF per phase, in a neutral and a talking pose.
     A [checker] passage that omits <<portrait>> shows the current layout's
     neutral pose, so Cam is on stage without any per-passage wiring;
     <<portrait>> overrides it for that one passage (a talking pose, a
     one-off image).

     Paths are relative to the built story.html: the build copies
     include/images beside it as dist/images (the assets: copy task).

     The layout is read from the body attribute layout.js owns, never
     recomputed here — that file is the only writer of the published seam.
     It is already set when the flush runs, since start handlers run before
     render handlers. */
  var NEUTRAL_POSE = [
    "images/cam/phase-0/neutral/phase-0-neutral.gif",
    "images/cam/phase-1/neutral/phase-1-neutral.gif",
    "images/cam/phase-2/neutral/phase-2-neutral.gif",
    "images/cam/phase-3/neutral/phase-3-neutral.gif",
  ];

  function neutralPose() {
    var layout = Number(document.body.getAttribute("data-layout"));
    return NEUTRAL_POSE[layout] || NEUTRAL_POSE[0];
  }

  /* ---- the two phases ------------------------------------------------- */

  function reset() {
    record = emptyRecord();
    /* A passage start is the boundary: old prose handles and their flushed
       state belong to the passage being left. An abandon from the previous
       reveal then finds nothing to restore. */
    lastFlush = new WeakMap();
    slotByProse = new WeakMap();
  }

  function flush() {
    writePortrait(record.cam || { src: neutralPose() });
    /* Both lines are written before either is revealed: the reveal decides what
       waits for what, and it needs the prose in place, because it reads its
       text nodes. Each handle is the element to grow, or null when the
       passage omitted that line. */
    var camLine = writeLine("bubble", record.bubble);
    var reply = writeLine("reply", record.reply);
    /* Called on every flush, nulls included: a passage with no lines is
       exactly when the previous passage's reveal must be abandoned, or it
       would hold and then paint slots this flush has just emptied.
       Loaded after this file (reveal.js); absent only if it failed to load, in
       which case every line is already on screen in full. */
    var reveal = /** @type {any} */ (window).Reveal;
    if (reveal) {
      reveal.start({ camLine: camLine, reply: reply });
    }
  }

  /* ---- transitions requested by the reveal ----------------------------
     reveal  Cam's line is growing: keep the data-state the flush published
             (its paper stays up), and mark it revealing and inert.
     hold    a waiting reply has not landed: its bar keeps the flushed paper,
             because the reveal has already emptied its prose, and it is marked
             revealing and inert so it cannot be read or entered early.
     land    the line is whole: filled, not revealing, reachable.
     abandon the new flush has already rewritten the slot; drop the transient
             class and inertness and put back the state that flush gave it. */
  function reveal(handle) {
    var slot = slotOf(handle);
    if (!slot) {
      return;
    }
    slot.classList.add("is-revealing");
    slot.setAttribute("inert", "");
  }

  function hold(handle) {
    var slot = slotOf(handle);
    if (!slot) {
      return;
    }
    /* The bar stays up while its message waits: the reveal has emptied the
       prose already, so the slot keeps the filled state the flush published
       and only the box is showing. */
    slot.classList.add("is-revealing");
    slot.setAttribute("inert", "");
  }

  function land(handle) {
    var slot = slotOf(handle);
    if (!slot) {
      return;
    }
    setState(slot, true);
    slot.classList.remove("is-revealing");
    slot.removeAttribute("inert");
  }

  function abandon(handle) {
    var slot = slotOf(handle);
    if (!slot) {
      return;
    }
    slot.classList.remove("is-revealing");
    slot.removeAttribute("inert");
    setState(slot, lastFlush.get(slot) === true);
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

  stage.reveal = reveal;
  stage.hold = hold;
  stage.land = land;
  stage.abandon = abandon;

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
