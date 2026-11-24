/* ===== The stage's content slots =====
   Four slots hold one passage's content: Cam's portrait (.stage-cam), Cam's
   speech-bubble (.stage-bubble), the system card (.stage-system) and the
   player's reply bar (.stage-reply). The frame, the background and the menu
   persist; these four do not. A layout composes only the slots it states, and
   the slots it does not compose stay empty and hidden.

   The content macros (registered in StoryInit, story.twee) record their
   content on their Slot while the passage renders; every Slot's
   content is cleared when a passage starts and written in one flush after the
   render. A passage that omits a macro therefore shows an empty Slot because
   the flush wrote nothing there — never because something cleared it first.

   The flush runs at :passagerender, after every macro has run. Three facts
   about that moment:
     - the passage element is still detached, and #passages still holds the
       OUTGOING passage: read content from the Slots, never from the DOM;
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

   This file is the only writer of the visible state. The flush publishes
   data-state and records what it gave each slot; is-revealing and inert are written only
   by the transitions the reveal requests. reveal marks Cam's growing line as
   revealing while keeping the flushed paper, hold marks a waiting reply as
   revealing and inert while keeping the flushed bar — its prose is already
   empty — land publishes a slot filled and reachable, and abandon puts back
   the state the most recent flush gave that Slot. The flush records that
   state on the Slot, so abandoning a line that a newer flush has already
   replaced cannot clobber the newer state. A passage start clears each
   Slot's content, so an abandon can never restore state from a passage before
   a failed or absent flush. */
(function () {
  "use strict";

  // Created by boot.js, which loads first; this file only adds members.

  /* ---- the slots: one record per named Slot ---------------------------
     A Slot owns its element, the prose element the Reveal grows, the content
     this passage recorded for it, and the state its last flush published.
     The bubble's prose is an inner box; every other Slot's prose is the Slot
     itself, so a Slot's shape is data here rather than a branch in the
     writer.

     publish() is the flush's write; it also records what the Slot was given so
     abandon can restore it. The transitions below change the element without
     changing that record. */
  var slots = {};

  /* A Slot's inner prose box, by slot name: the box the writer puts the line
     in. A slot not named here is its own prose. The bubble and the system
     card grow their content in an inner box, and the system card's box is the
     reading card's shared one. */
  var SLOT_PROSE = {
    bubble: "stage-bubble-prose",
    system: "reading-card-prose",
  };

  function createSlot(name) {
    var element = document.querySelector(
      '.stage-slot[data-stage-slot="' + name + '"]',
    );
    if (!element) {
      return null;
    }
    return {
      element: element,
      proseClass: SLOT_PROSE[name] || null,
      content: null,
      prose: null,
      flushed: false,
      /* The portrait's current pose and the artwork of the layout's phase. An
         authored portrait has no pose: it is shown statically. */
      pose: "neutral",
      authored: false,
      neutralSrc: null,
      talkingSrc: null,
    };
  }

  function slot(name) {
    if (!slots[name]) {
      slots[name] = createSlot(name);
    }
    return slots[name];
  }

  function setState(s, filled) {
    s.element.setAttribute("data-state", filled ? "filled" : "empty");
  }

  function publish(s, filled) {
    s.flushed = filled;
    setState(s, filled);
  }

  function clear(s) {
    s.content = null;
    s.prose = null;
  }

  /* Paint the portrait and publish which pose it is. An authored portrait
     carries no pose marker: the pose offsets belong to the layout's two
     artworks, not to an image the passage pinned by hand. */
  function paintPortrait(cam, src, alt, pose) {
    var img = document.createElement("img");
    img.className = "stage-portrait";
    img.setAttribute("src", displaySource(src));
    img.setAttribute("alt", alt);
    cam.element.append(img);
    cam.pose = pose;
    if (pose) {
      cam.element.setAttribute("data-pose", pose);
    } else {
      cam.element.removeAttribute("data-pose");
    }
  }

  function writePortrait(value) {
    var cam = slot("cam");
    if (!cam) {
      return;
    }
    cam.element.textContent = "";
    if (!value || !value.src) {
      var phase = phaseIndex();
      cam.authored = false;
      cam.neutralSrc = NEUTRAL_POSE[phase] || NEUTRAL_POSE[0];
      cam.talkingSrc = TALKING_POSE[phase] || TALKING_POSE[0];
      paintPortrait(cam, cam.neutralSrc, "Cam", "neutral");
      publish(cam, true);
      /* A pose drawn in two layers lifts its hand out here; every other pose
         has none, and this clears whatever the last passage left. */
      writeHand(handFor(cam.neutralSrc), "neutral");
      preload(cam.neutralSrc);
      preload(cam.talkingSrc);
      preload(handFor(cam.neutralSrc));
      preload(handFor(cam.talkingSrc));
      preload(STILL[cam.neutralSrc]);
      preload(STILL[cam.talkingSrc]);
      return;
    }
    cam.authored = true;
    cam.neutralSrc = String(value.src);
    cam.talkingSrc = null;
    paintPortrait(cam, cam.neutralSrc, String(value.alt || "Cam"), null);
    publish(cam, true);
    /* An authored portrait is shown as one image, so any hand it names keeps
       the image's own framing rather than a pose offset. */
    writeHand(handFor(cam.neutralSrc), null);
  }

  /* ---- switching the portrait's pose -----------------------------------
     The Reveal decides when Cam is speaking; this file owns what that means
     for the portrait, and the player's Cam-animations toggle decides whether
     it happens at all. The swap replaces the body image's source, so the
     talking GIF starts at its first frame. The hand layer follows the pose:
     a pose with a hand in the table shows it, and one without clears the
     layer.

     Whether the player wants Cam's portrait to change pose. A build without
     the settings module keeps the animations on. */
  function camAnimations() {
    var settings = /** @type {any} */ (window).CamSettings;
    return settings && typeof settings.camAnimations === "function"
      ? settings.camAnimations()
      : true;
  }

  /* The image a pose should show: the GIF itself while animations are on, and
     its still while they are off. A split pose's still is the composite image
     that carries its body and hand together. A source with no still in the
     table — an authored portrait — keeps its own image. */
  function displaySource(src) {
    var path = String(src);
    return camAnimations() ? path : STILL[path] || path;
  }

  /* Paint whatever pose the slot currently names, through the animated or
     still source rule. Also rebuilds the hand layer from the same pose. */
  function repaintPortrait(cam) {
    if (!cam) {
      return;
    }
    var src = cam.neutralSrc;
    if (!cam.authored && cam.pose === "talking") {
      src = cam.talkingSrc;
    }
    var img = cam.element.querySelector(".stage-portrait");
    if (img) {
      img.setAttribute("src", displaySource(src));
    }
    writeHand(handFor(src), cam.authored ? null : cam.pose);
  }

  function setPose(cam, pose) {
    if (
      !cam ||
      cam.authored ||
      !cam.flushed ||
      cam.pose === pose ||
      !camAnimations()
    ) {
      return;
    }
    cam.pose = pose;
    cam.element.setAttribute("data-pose", pose);
    repaintPortrait(cam);
  }

  /* Warm every source a pose can show — body, hand and still — so the pose
     swap and the animations toggle never wait on a fetch or a decode. The
     cache is keyed by path; an already-warm source is left alone. */
  var preloaded = {};

  function preload(src) {
    if (!src || preloaded[src]) {
      return;
    }
    preloaded[src] = new Image();
    preloaded[src].src = src;
  }

  /* ---- the hand layer: poses drawn in two halves ------------------------
     Phase 2's two poses are each a body and a hand on the same canvas, split
     so the hand can rest on the menu while the body stays behind it: in that
     composition the menu rises across the portrait, and a gesture buried
     behind the panel would be gone.

     The table is the authority. A pose with one file
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
    "images/cam/phase-2/neutral/phase-2-neutral-body.gif":
      "images/cam/phase-2/neutral/phase-2-neutral-hand.gif",
    "images/cam/phase-2/talking/phase-2-talking-body.gif":
      "images/cam/phase-2/talking/phase-2-talking-hand.gif",
  };

  function handFor(src) {
    return HAND_LAYER[src] || null;
  }

  /* The layer carries the pose its image belongs to, and an authored
     portrait's hand takes no pose offset. When the animations are off, a
     built-in pose's body is already its composite still, so the separate
     hand is left out. */
  function writeHand(src, pose) {
    var layer = document.querySelector(".stage-cam-hand");
    if (!layer) {
      return;
    }
    layer.textContent = "";
    if (pose) {
      layer.setAttribute("data-pose", pose);
    } else {
      layer.removeAttribute("data-pose");
    }
    if (!src || (pose && !camAnimations())) {
      return;
    }
    var img = document.createElement("img");
    img.className = "stage-hand";
    img.setAttribute("src", displaySource(String(src)));
    /* Decorative: the body image already names Cam, so a second alt would
       announce the same portrait twice. */
    img.setAttribute("alt", "");
    layer.append(img);
  }

  /* Returns a handle for the Reveal — the Slot and the prose element it must
     grow — or null when there was nothing to write.

     The bubble owns two layers inside its one Slot: the paper is its ::before
     (the Pixel frame's paper variant) and the line goes into the inner prose
     box the Slot's shape declares, so the paper stays fixed while a long line
     scrolls and never lands on its outline. The system card does the same
     through the reading card's prose box; the reply bar is a single element
     whose own box scrolls. */
  function writeLine(s, html) {
    if (!s) {
      return null;
    }
    s.element.textContent = "";
    s.prose = null;
    if (html == null || html === "") {
      publish(s, false);
      return null;
    }
    var target = s.element;
    if (s.proseClass) {
      target = document.createElement("div");
      target.className = s.proseClass;
      s.element.append(target);
    }
    jQuery(target).wiki(String(html));
    publish(s, true);
    s.prose = target;
    return { slot: s, prose: target };
  }

  /* ---- the default portrait: the layout's phase, in two poses ----------
     Cam's artwork is one GIF per phase, in a neutral and a talking pose.
     A [checker] passage that omits <<portrait>> shows the current layout's
     neutral pose, so Cam is on stage without any per-passage wiring, and
     switches to the talking pose while the Reveal grows his line. An authored
     <<portrait>> pins one image for the whole passage instead; it has no
     talking counterpart to switch to.

     Paths are relative to the built story.html: the build copies
     include/images beside it as dist/images (the assets: copy task).

     The layout is read through layout.js's published seam, never recomputed
     here — that file owns the normalisation and the attribute. It is already
     set when the flush runs, since start handlers run before render handlers. */
  function publishedLayout() {
    return window.Layout.current();
  }

  /* The System layout composes no portrait and no speech-bubble. Read from the
     published attribute, so the same seam that selects the layout's phase
     selects whether Cam is on stage at all. */
  function isSystemLayout() {
    return publishedLayout() === 4;
  }

  var NEUTRAL_POSE = [
    "images/cam/phase-0/neutral/phase-0-neutral.gif",
    "images/cam/phase-1/neutral/phase-1-neutral.gif",
    "images/cam/phase-2/neutral/phase-2-neutral-body.gif",
    "images/cam/phase-3/neutral/phase-3-neutral.gif",
  ];

  var TALKING_POSE = [
    "images/cam/phase-0/talking/phase-0-talking.gif",
    "images/cam/phase-1/talking/phase-1-talking.gif",
    "images/cam/phase-2/talking/phase-2-talking-body.gif",
    "images/cam/phase-3/talking/phase-3-talking.gif",
  ];

  /* A split pose's still is its composite image: the body and the hand cut
     apart for animation, drawn together for the still, so the hand layer can
     stay empty while the animations are off. */
  var POSE_STILL = {
    "images/cam/phase-2/neutral/phase-2-neutral-body.gif":
      "images/cam/phase-2/neutral/phase-2-neutral.png",
    "images/cam/phase-2/talking/phase-2-talking-body.gif":
      "images/cam/phase-2/talking/phase-2-talking.png",
  };

  /* First-frame stills: one PNG beside every built-in GIF, named by the GIF's
     path with the extension changed, unless the pose has a composite still of
     its own above. The Cam-animations toggle swaps a GIF for its still. Built
     from the pose tables, so a new pose has no second list to update. */
  var STILL = {};

  function addStill(src) {
    if (src) {
      STILL[src] = POSE_STILL[src] || String(src).replace(/\.gif$/i, ".png");
    }
  }

  NEUTRAL_POSE.forEach(addStill);
  TALKING_POSE.forEach(addStill);

  /* The Phase a layout selects, as the index of its artwork pair. Read from
     the published attribute, never recomputed from $layout; an unknown index
     falls back to the first pair. */
  function phaseIndex() {
    var layout = publishedLayout();
    return NEUTRAL_POSE[layout] ? layout : 0;
  }

  /* ---- the two phases ------------------------------------------------- */

  function reset() {
    /* A passage start is the boundary: old prose handles and their flushed
       state belong to the passage being left. An abandon from the previous
       reveal then finds nothing to restore. */
    for (var name in slots) {
      if (Object.prototype.hasOwnProperty.call(slots, name) && slots[name]) {
        clear(slots[name]);
        slots[name].flushed = false;
      }
    }
  }

  /* Empty the portrait and its hand layer without painting a replacement: the
     System layout composes neither, so the slots it does not state are left
     with nothing rather than with the pose of the layout being left. */
  function clearCam() {
    var cam = slot("cam");
    if (!cam) {
      return;
    }
    cam.element.textContent = "";
    cam.element.removeAttribute("data-pose");
    cam.authored = false;
    cam.neutralSrc = null;
    cam.talkingSrc = null;
    publish(cam, false);
    writeHand(null, null);
  }

  function flush() {
    var cam = slot("cam");
    var bubble = slot("bubble");
    var system = slot("system");
    var replySlot = slot("reply");
    if (isSystemLayout()) {
      clearCam();
    } else {
      writePortrait(cam && cam.content);
    }
    /* Every line is written before any is revealed: the reveal decides what
       waits for what, and it needs the prose in place because it reads its
       text nodes. Each handle carries the Slot and the element to grow, or is
       null when the passage omitted that line. The system card is written but
       not handed to the reveal: a system message arrives whole. */
    var camLine = writeLine(bubble, bubble && bubble.content);
    writeLine(system, system && system.content);
    var reply = writeLine(replySlot, replySlot && replySlot.content);
    /* Called on every flush, nulls included: a passage with no lines is
       exactly when the previous passage's reveal must be abandoned, or it
       would hold and then paint Slots this flush has just emptied.
       Loaded before this file (reveal.js); absent only if it failed to load, in
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
  function busy(handle) {
    var s = handle && handle.slot;
    if (!s) {
      return;
    }
    /* The bar stays up while its message waits: the reveal has emptied the
       prose already, so the Slot keeps the filled state the flush published
       and only the box is showing. */
    s.element.classList.add("is-revealing");
    s.element.setAttribute("inert", "");
  }

  function land(handle) {
    var s = handle && handle.slot;
    if (!s) {
      return;
    }
    setState(s, true);
    s.element.classList.remove("is-revealing");
    s.element.removeAttribute("inert");
  }

  function abandon(handle) {
    var s = handle && handle.slot;
    if (!s) {
      return;
    }
    s.element.classList.remove("is-revealing");
    s.element.removeAttribute("inert");
    setState(s, s.flushed);
  }

  /* ---- the interface: content, not slots ------------------------------
     Callers name content (Cam's line, the player's line, the portrait); the
     slot names stay in this file, apart from the markup contract they share
     with shell.twee's data-stage-slot attributes. An omitted alt falls back
     to "Cam" here so the macros stay pass-through. */

  /* boot.js, which loads before this file, creates window.Stage. */
  var stage = /** @type {any} */ (window).Stage;

  /* reveal and hold ask for the same visible state: the Slot is busy, keeps
     its flushed paper, and is inert. They stay two names because the Reveal
     asks for them for different reasons. */
  stage.reveal = busy;
  stage.hold = busy;
  stage.land = land;
  stage.abandon = abandon;

  /* The portrait's pose, requested by the Reveal at the same moments it asks
     for the bubble's transitions: speaking while a line is being revealed,
     silent when it lands, is skipped or is abandoned. */
  stage.speaking = function () {
    setPose(slot("cam"), "talking");
  };

  stage.silent = function () {
    setPose(slot("cam"), "neutral");
  };

  /* The Cam-animations toggle asks for this after either side of the switch:
     repaint the current portrait through the new source rule, and settle a
     talking pose to neutral when the animations go off. */
  stage.refreshCam = function () {
    var cam = slot("cam");
    if (!cam || !cam.flushed) {
      return;
    }
    if (!cam.authored && !camAnimations()) {
      cam.pose = "neutral";
      cam.element.setAttribute("data-pose", "neutral");
    }
    repaintPortrait(cam);
  };

  /* One setter per named Slot: a content macro hands over the line, and the
     Slot it lands in stays private to this file. */
  function contentSetter(name) {
    return function (html) {
      var s = slot(name);
      if (s) {
        s.content = html;
      }
    };
  }

  stage.setCamLine = contentSetter("bubble");
  stage.setPlayerLine = contentSetter("reply");
  stage.setSystemLine = contentSetter("system");

  stage.setPortrait = function (src, alt) {
    var cam = slot("cam");
    if (cam) {
      cam.content = { src: src, alt: alt };
    }
  };

  stage.onPassageStart(reset);
  stage.onPassageRender(flush);
})();
