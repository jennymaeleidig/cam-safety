/* ===== The reveal: Cam's line arrives one character at a time =====
   stage.js writes both lines into their slots in one flush and hands this
   file the prose element for each: `{ camLine, reply }`, either may be null.
   This file then grows the bubble's prose box, with one letter of voice per
   character, and asks the Stage for every visible state change.

   Only Cam speaks. The reply bar is the player's own line, so it is neither
   revealed nor sounded: it arrives whole, at its turn, once Cam has finished.
   That is one rule, stated in `start()` by role (`camLine` or `reply`), and it
   is why this file can be small — at most one line is ever revealed per
   passage, so at most one line ever waits.

   While Cam speaks, the reply is held empty: the Stage publishes it
   data-state="empty" and inert for the length of the reveal, and filled and
   reachable the moment the line lands. This file does not write those — it
   asks the Stage for hold, land and abandon. The Stage is the only writer of
   data-state, is-revealing and inert; the flush records what it gave each
   slot, so abandoning a line after a newer flush cannot clobber the newer
   state.

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

   A frame that catches up — a stalled frame, or a tab returning from the
   background — can owe a hundred characters. It gets to speak two of them:
   beyond that the letters would start in a single instant and sum into the
   clipped burst the compressor exists to prevent. The text still catches up in
   full; only the voice skips.

   prefers-reduced-motion: no reveal at all, and with it no sound. The flush has
   already put the lines in full on screen when this file declines. */
(function () {
  "use strict";

  var win = /** @type {any} */ (window);
  var Reveal = (win.Reveal = win.Reveal || {});

  /* The one fallback for a build without settings.js (an editor preview, or a
     stripped build): 16 ms per character, the tuned default. The contract and
     the tuned numbers live in settings.js; this literal must not grow into a
     second copy of them. */
  var ABSENT_SETTINGS_MS = 16;
  var MAX_MS = 6000;
  var MIN_MS = 4;
  /* How many letters one frame may sound when it is catching up. Two is under
     what the compressor already handles at the default pace (a 75 ms letter
     every 16 ms overlaps four voices); a hundred is not. A faster pace packs
     more voices into the same 75 ms, and the compressor is what keeps that
     sum in range. */
  var LETTERS_PER_FRAME = 2;

  /* Milliseconds per character, from the settings module's semantic read.
     The module owns the dialog's unit, default and clamping; this file only
     consumes the time. A story built without it gets the tuned 16 ms. */
  function msPerChar() {
    var settings = win.CamSettings;
    if (settings && typeof settings.msPerChar === "function") {
      return settings.msPerChar();
    }
    return ABSENT_SETTINGS_MS;
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
    var node;
    while ((node = walker.nextNode())) {
      var full = node.nodeValue || "";
      if (!full) {
        continue;
      }
      nodes.push({ node: node, full: full, start: at });
      var end = at + full.length;
      if (node.parentElement && node.parentElement.closest("a")) {
        steps.push({ chars: end, letter: "" });
      } else {
        for (var i = 0; i < full.length; i += 1) {
          steps.push({ chars: at + i + 1, letter: full.charAt(i) });
        }
      }
      at = end;
    }
    return { nodes: nodes, steps: steps };
  }

  function paint(planned, chars) {
    for (var i = 0; i < planned.nodes.length; i += 1) {
      var entry = planned.nodes[i];
      var take = chars - entry.start;
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

  function line(prose) {
    return {
      /* The prose handle the Stage handed over: the bubble's inner box, or the
         reply slot itself. This is the only text the reveal grows; it never
         identifies a slot from markup. */
      prose: prose,
      plan: planLine(prose),
      step: 0,
      startedAt: 0,
      ms: msPerChar(),
    };
  }

  function total(entry) {
    return entry.plan.steps.length;
  }

  function paintTo(entry) {
    var steps = entry.plan.steps;
    paint(entry.plan, entry.step > 0 ? steps[entry.step - 1].chars : 0);
  }

  /* Ask the Stage to publish the transition. It owns data-state, is-revealing
     and inert; absent only if that file failed to load, in which case the
     flush has already put both lines on screen in full. */
  function request(name, entry, blank) {
    var stage = win.Stage;
    if (stage && typeof stage[name] === "function") {
      stage[name](entry.prose, blank);
    }
  }

  /* Hide the line's paper and its text. Used for the line waiting its turn. */
  function hold(entry) {
    paint(entry.plan, 0);
    request("hold", entry, true);
  }

  /* Show all of it, at once. Also what skipping does. */
  function land(entry) {
    entry.step = total(entry);
    paintTo(entry);
    request("land", entry);
  }

  /* Forget the line without restoring it: the incoming passage's flush is
     about to rewrite the slot anyway, and the Stage restores the state that
     flush published. */
  function abandon(entry) {
    request("abandon", entry);
  }

  /* Show as much as `now` has earned, and report whether the line is done. */
  function advance(entry, now) {
    var steps = entry.plan.steps;
    var want = Math.floor((now - entry.startedAt) / entry.ms) + 1;
    if (want > steps.length) {
      want = steps.length;
    }
    var spoken = 0;
    while (entry.step < want) {
      var step = steps[entry.step];
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
       grows, so hold it without blanking its published state. */
    request("hold", entry, false);
    return advance(entry, now);
  }

  /* ---- the sequence ----------------------------------------------------- */

  var speaking = null;
  var waiting = null;
  var frame = 0;

  function stop() {
    if (frame) {
      win.cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  function finish() {
    stop();
    if (speaking) {
      land(speaking);
      speaking = null;
    }
    if (waiting) {
      land(waiting);
      waiting = null;
    }
  }

  function tick(now) {
    frame = 0;
    if (!speaking) {
      return;
    }
    if (advance(speaking, now)) {
      finish();
      return;
    }
    frame = win.requestAnimationFrame(tick);
  }

  /* Called by stage.js's flush with the prose handles it just filled: one of
     camLine or reply, both, or neither. Also called with neither: a passage
     with no lines is exactly when the previous passage's reveal has to be
     dropped, or it would hold and then paint slots the flush has emptied. */
  Reveal.start = function (lines) {
    var record = lines || {};
    stop();
    if (speaking) {
      abandon(speaking);
      speaking = null;
    }
    if (waiting) {
      abandon(waiting);
      waiting = null;
    }
    if (reducedMotion()) {
      return;
    }

    var camIn = record.camLine ? line(record.camLine) : null;
    if (!camIn || total(camIn) === 0) {
      /* Nobody speaks: a passage with no Cam line, or a bubble that wiki'd down
         to whitespace. Nothing is revealed, so nothing waits. */
      return;
    }

    if (record.reply) {
      var queued = line(record.reply);
      if (total(queued) > 0) {
        hold(queued);
        waiting = queued;
      }
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
    if (speaking || waiting) {
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
