/* ===== The reveal: Cam's line arrives one character at a time =====
   stage.js writes both lines into their Slots in one flush and hands this
   file a handle for each role: `{ camLine, reply }`, each either a
   `{ slot, prose }` handle or null. This file then grows the handle's prose
   element, with one letter of voice per character, and asks the Stage for
   every visible state change.

   Only Cam speaks. The reply bar is the player's own line, so it is neither
   revealed nor sounded: it arrives whole, at its turn, once Cam has finished.
   That is one rule, stated in `start()` by role (`camLine` or `reply`), and it
   is why this file can be small — at most one line is ever revealed per
   passage, so at most one line ever waits.

   While Cam speaks, the reply's paper is up but its message is held: the
   Stage marks the bar revealing and inert for the length of the reveal, and
   reachable the moment the line lands. This file empties the prose itself,
   through the plan below, so the box a player is about to fill stays visible
   while the words wait. This file does not write the slot's state — it asks
   the Stage for reveal, hold, land and abandon.

   The reveal grows text nodes rather than re-wikifying: jQuery.wiki() output is
   already live on the detached passage element, SugarCube having bound link
   handling per anchor at parse time. Emptying a text node leaves its anchor in
   place, so a link interrupted by a new passage is still a link.

   A revealing or held slot is also inert, which is what makes its links
   genuinely unreachable: not just unclickable with the pointer but unfocusable
   and out of the accessibility tree, so a held reply cannot be tabbed to and
   entered before the player has seen it. The skip listener is on the document
   in the capture phase, so clicking inert content still skips.

   Links are not revealed character by character and are not sounded. A link's
   text is one step of the reveal, appearing whole the moment its first
   character would have, and it does not advance the clock: a link costs zero
   milliseconds, so a link-heavy line does not stall while the link sits on
   screen. A link is a word to act on, not a word to hear.

   Pacing is asked of the settings module as milliseconds per character
   (settings.js, window.CamSettings.msPerChar(), the "Text speed" range). This
   file knows neither its unit nor its default. The value is read when a line
   starts, so a change lands on the next line rather than mid-line. A whole
   line is capped at MAX_MS by shortening the per-character delay once a line
   is long enough to exceed it, so no passage can make the player wait, however
   slowly they set the pace.

   The typewriter toggle is asked at the same moment: when it is off, the
   flush's whole lines are landed at once, with no reveal, no beat and no
   sound. A changed toggle therefore lands on the next passage, like a changed
   pace.

   A frame that catches up — a stalled frame, or a tab returning from the
   background — can owe a hundred characters. It gets to speak two of them:
   beyond that the letters would start in a single instant and sum into the
   clipped burst the compressor exists to prevent. The text still catches up in
   full; only the voice skips.

   prefers-reduced-motion: no reveal at all, and with it no sound. The flush has
   already put Cam's line in full on screen when this file declines. If there is
   a Cam line, his talking pose is still held for one fixed beat, and a reply
   waits behind it, held empty and inert, so the turn-taking rhythm survives
   without any character-by-character motion. Space, enter, escape or a pointer
   press ends the beat early. There is no beat when no Cam line arrived, and no
   beat when the reveal declines only because no gesture has woken the Voice.

   The portrait's pose is not this file's data: this file asks the Stage to
   speak, land, hold and abandon, and the Stage writes what is true. The pose
   follows the same clock as the line. */
(function () {
  "use strict";

  var win = /** @type {any} */ (window);
  win.Reveal = win.Reveal || {};
  var Reveal = /** @type {any} */ (win.Reveal);

  var MAX_MS = 6000;
  var MIN_MS = 4;
  /* How many letters one frame may sound when it is catching up. Two is under
     what the compressor already handles at the default pace (a 75 ms letter
     every 20 ms overlaps four voices); a hundred is not. A faster pace packs
     more voices into the same 75 ms, and the compressor is what keeps that
     sum in range. */
  var LETTERS_PER_FRAME = 2;

  /* The talking pose's beat when prefers-reduced-motion declines the reveal.
     A starting value, not a measured one: long enough for the pose to read as
     speech, short enough not to delay a player who asked for no motion. */
  var BEAT_MS = 1200;

  /* Milliseconds per character, from the settings module's semantic read.
     The module owns the dialog's unit, tuned default, clamping and fallback;
     this file only consumes the time. Without the settings module, the reveal
     runs as fast as the clock allows rather than stalling. */
  function msPerChar() {
    var settings = win.CamSettings;
    return settings && typeof settings.msPerChar === "function"
      ? settings.msPerChar()
      : 0;
  }

  function reducedMotion() {
    return !!(
      win.matchMedia &&
      win.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /* ---- the plan: the line as a list of steps ---------------------------
     A step is what one tick of the clock reveals: one character, or one whole
     link. `chars` is how much of the line is on screen after the step, so the
     paint never needs to know which kind of step it is; `letter` is what to
     say, and is empty for a link. */
  function planLine(prose) {
    var walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var steps = [];
    var at = 0;
    var full;
    var end;
    var i;
    var node = walker.nextNode();
    while (node) {
      full = node.nodeValue || "";
      if (full) {
        nodes.push({ node: node, full: full, start: at });
        end = at + full.length;
        if (node.parentElement && node.parentElement.closest("a")) {
          steps.push({ chars: end, letter: "" });
        } else {
          for (i = 0; i < full.length; i += 1) {
            steps.push({ chars: at + i + 1, letter: full.charAt(i) });
          }
        }
        at = end;
      }
      node = walker.nextNode();
    }
    return { nodes: nodes, steps: steps };
  }

  function paint(planned, chars) {
    var i;
    var entry;
    var take;
    for (i = 0; i < planned.nodes.length; i += 1) {
      entry = planned.nodes[i];
      take = chars - entry.start;
      if (take <= 0) {
        entry.node.nodeValue = "";
      } else if (take >= entry.full.length) {
        entry.node.nodeValue = entry.full;
      } else {
        entry.node.nodeValue = entry.full.slice(0, take);
      }
    }
  }

  /* ---- one line -------------------------------------------------------- */

  function line(handle) {
    return {
      /* The handle the Stage handed over: the Slot and the prose element the
         reveal grows. This is the only text the reveal touches; it never
         identifies a Slot from markup. */
      handle: handle,
      plan: planLine(handle.prose),
      step: 0,
      startedAt: 0,
      ms: msPerChar(),
    };
  }

  function total(entry) {
    return entry.plan.steps.length;
  }

  /* A waiting reply is emptied and held; nothing waits when the reply wiki'd
     down to whitespace. */
  function queueReply(handle) {
    if (!handle) {
      return;
    }
    var entry = line(handle);
    if (total(entry) > 0) {
      hold(entry);
      waiting = entry;
    }
  }

  function paintTo(entry) {
    var steps = entry.plan.steps;
    paint(entry.plan, entry.step > 0 ? steps[entry.step - 1].chars : 0);
  }

  /* Each transition asks the Stage, which owns data-state, is-revealing and
     inert. The Stage is absent only if that file failed to load, in which case
     the flush has already put both lines on screen in full. */
  function askStage(method, handle) {
    var stage = win.Stage;
    if (stage && typeof stage[method] === "function") {
      stage[method](handle);
    }
  }

  /* Cam's growing line keeps the paper the flush gave it. Used when Cam
     starts speaking. */
  function reveal(entry) {
    askStage("reveal", entry.handle);
  }

  /* Empty the line's text; the Stage keeps its paper up and marks the Slot
     inert. Used for the line waiting its turn. */
  function hold(entry) {
    paint(entry.plan, 0);
    askStage("hold", entry.handle);
  }

  /* The portrait speaks with the line. */
  function speak() {
    askStage("speaking");
  }

  /* The line is whole: the portrait settles. */
  function silence() {
    askStage("silent");
  }

  /* Show all of it, at once. Also what skipping does. */
  function land(entry) {
    entry.step = total(entry);
    paintTo(entry);
    askStage("land", entry.handle);
  }

  /* Forget the line without restoring it: the incoming passage's flush is
     about to rewrite the Slot anyway, and the Stage restores the state that
     flush published. */
  function abandon(entry) {
    askStage("abandon", entry.handle);
  }

  /* Show as much as `now` has earned, and report whether the line is done. */
  function advance(entry, now) {
    var steps = entry.plan.steps;
    var want = Math.floor((now - entry.startedAt) / entry.ms) + 1;
    if (want > steps.length) {
      want = steps.length;
    }
    var spoken = 0;
    var step;
    while (entry.step < want) {
      step = steps[entry.step];
      if (step.letter && spoken < LETTERS_PER_FRAME) {
        if (win.Voice) {
          win.Voice.letter(step.letter);
        }
        spoken += 1;
      }
      entry.step += 1;
    }
    paintTo(entry);
    return entry.step >= steps.length;
  }

  function start(entry, now) {
    entry.startedAt = now;
    entry.ms = Math.max(
      MIN_MS,
      Math.min(msPerChar(), MAX_MS / Math.max(total(entry), 1)),
    );
    /* Cam's line is revealed in place: its paper stays up while the prose
       grows, so keep the flushed state and only mark it revealing. */
    reveal(entry);
    speak();
    return advance(entry, now);
  }

  /* ---- the sequence ----------------------------------------------------- */

  var speaking = null;
  var waiting = null;
  var frame = 0;
  /* The reduced-motion beat's end, or 0 when no beat is running. */
  var beat = 0;

  function stop() {
    if (frame) {
      win.cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  function finish() {
    stop();
    beat = 0;
    if (speaking) {
      land(speaking);
      speaking = null;
    }
    if (waiting) {
      land(waiting);
      waiting = null;
    }
    silence();
  }

  function tick(now) {
    frame = 0;
    if (beat) {
      if (now < beat) {
        frame = win.requestAnimationFrame(tick);
        return;
      }
      finish();
      return;
    }
    if (!speaking) {
      return;
    }
    if (advance(speaking, now)) {
      finish();
      return;
    }
    frame = win.requestAnimationFrame(tick);
  }

  /* Called by stage.js's flush with the handles it just filled: one of
     camLine or reply, both, or neither. Also called with neither: a passage
     with no lines is exactly when the previous passage's reveal has to be
     dropped, or it would hold and then paint Slots the flush has emptied. */
  Reveal.start = function (handles) {
    var input = handles || {};
    stop();
    beat = 0;
    if (speaking) {
      abandon(speaking);
      speaking = null;
      /* The incoming flush has already painted the new passage's portrait;
         this puts the previous line's pose back to quiet at the same moment
         its Slot is abandoned. */
      silence();
    }
    if (waiting) {
      abandon(waiting);
      waiting = null;
    }

    var camIn = input.camLine ? line(input.camLine) : null;
    var hasCamLine = !!camIn && total(camIn) > 0;

    /* The typewriter is off: the flush already wrote both lines whole, so
       land them where they stand and leave the portrait neutral. */
    var settings = win.CamSettings;
    if (
      settings &&
      typeof settings.revealEnabled === "function" &&
      !settings.revealEnabled()
    ) {
      if (camIn) {
        land(camIn);
      }
      if (input.reply) {
        land(line(input.reply));
      }
      silence();
      return;
    }

    /* No gesture has woken the voice yet, so a reveal now would type in
       silence. Leave the flush's lines whole on screen and the portrait
       neutral — including under reduced motion, where a restored page should
       not pretend to speak. */
    var voice = win.Voice;
    if (voice && typeof voice.audible === "function" && !voice.audible()) {
      return;
    }

    if (reducedMotion()) {
      if (!hasCamLine) {
        return;
      }
      if (input.reply) {
        queueReply(input.reply);
      }
      speak();
      beat = win.performance.now() + BEAT_MS;
      frame = win.requestAnimationFrame(tick);
      return;
    }

    if (!hasCamLine) {
      /* Nobody speaks: a passage with no Cam line, or a bubble that wiki'd down
         to whitespace. Nothing is revealed, so nothing waits. */
      return;
    }

    if (input.reply) {
      queueReply(input.reply);
    }

    speaking = camIn;
    /* A line that is all link — or one character — can be whole before this
       function returns. */
    if (start(speaking, win.performance.now())) {
      finish();
      return;
    }
    frame = win.requestAnimationFrame(tick);
  };

  /* Space, enter or escape finishes the line, so a player who reads faster than
     Cam talks is never made to wait. Not every key: tab and the arrow keys
     belong to the menu, and a keystroke there should not land a line the player
     has not read. Capture phase and no preventDefault, so the same event still
     belongs to whatever it was for. */
  Reveal.skip = function () {
    if (speaking || waiting || beat) {
      finish();
    }
  };

  function isSkipKey(ev) {
    return (
      ev.key === " " || ev.key === "Spacebar" || ev.key === "Enter" || ev.key === "Escape"
    );
  }

  document.addEventListener(
    "pointerdown",
    function () {
      Reveal.skip();
    },
    true,
  );

  document.addEventListener(
    "keydown",
    function (ev) {
      if (isSkipKey(ev)) {
        Reveal.skip();
      }
    },
    true,
  );
})();
