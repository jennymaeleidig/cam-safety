/* ===== Cam's voice: one animalese letter per character =====
   Every letter of Cam's line is spoken as one letter from a 26-letter library
   (voice-letters.js, animalese), pitched down slightly so it reads as a voice
   and not a chipmunk. reveal.js decides when: this file knows only how.

   Three numbers, all chosen by ear on the built story:
     PITCH      0.8  — below the recording's own pitch
     VOLUME     25 % — under the background, not over it; a range in the
                 Settings dialog (settings.js), defaulted to the measured 0.25
     FADE_MS    10.5 — see below; 0 makes the crackle audible again

   Two faults shape this file, both of them about letters cut out of a longer
   recording:
     1. Each letter is cut at a point that is not a zero crossing, so starting
        and stopping it at full amplitude is a step edge — a click, once per
        character. A per-letter gain envelope ramps in and out (FADE_MS), which
        removes it without touching the attack.
     2. A letter is 75 ms and characters arrive every 16 ms, so four or five
        voices overlap and sum; four at full scale is 4.0, and everything past
        1.0 is clamped by the output — grit on every loud letter. One
        compressor on the sum, rather than a quieter voice, keeps the level up
        when only one letter is sounding.

   Measured with an OfflineAudioContext running this graph, 48 letters at
   16 ms apart, pitch 0.8: straight to the output they peak at 1.31 with 7
   sample steps over 0.25 (clipping); through the envelope, compressor and
   volume above they peak at 0.23 with no step over 0.25. The peak difference
   is mostly VOLUME; the steps are the fault this file exists to remove. See
   docs/research/animalese-typewriter.md §7. The player can raise either the
   volume or the pace above what was measured; the compressor, and the sum it
   squashes, are what make that safe to allow.

   The context is created on the first gesture, never at load: one made before
   a gesture starts suspended and logs a warning. Until it is running, letters
   are silence — the line still reveals. */
(function () {
  "use strict";

  var win = /** @type {any} */ (window);
  var Voice = (win.Voice = win.Voice || {});
  var letters = win.VoiceLetters || null;

  var PITCH = 0.8;
  /* The default gain: the Settings dialog stores percent, and 25 is the 0.25
     the graph was measured at. Kept as a gain because that is what the graph
     wants. */
  var DEFAULT_VOLUME = 0.25;
  var FADE_MS = 10.5;

  /* A setting's value, or NaN when the story carries no such setting (an
     editor preview, or a build that dropped settings.js). SugarCube replaces
     its settings object when it loads saved values, so ask it rather than
     reading the object once. */
  function readSetting(name) {
    var sc = win.SugarCube;
    var get = sc && sc.Setting && sc.Setting.getValue;
    return get ? Number(get(name)) : NaN;
  }

  /* Gain from the dialog's percentage. Read per letter rather than once, so a
     player dragging the slider hears the change without waiting for a new
     line, and nothing scheduled before the drag is cut off — a letter is
     75 ms long. */
  function level() {
    var percent = readSetting("voiceVolume");
    if (!(percent >= 0 && percent <= 100)) {
      return DEFAULT_VOLUME;
    }
    return percent / 100;
  }

  /* Wall-clock length of one letter: the library's own output length. The
     letters are laid out at this stride, so a letter is always this long of
     wall time whatever the pitch (source.start() divides it back down). */
  var LETTER_SECONDS = (letters && letters.secondsPerLetter) || 0.075;

  var audio = { ctx: null, buffer: null, comp: null, master: null };

  function ensure() {
    if (audio.ctx) {
      return audio.ctx;
    }
    if (!letters || !letters.pcmBase64) {
      return null; // built without the library: silent, still readable
    }
    var Ctx = win.AudioContext || win.webkitAudioContext;
    if (!Ctx) {
      return null;
    }
    var ctx = new Ctx();
    /* voices -> compressor -> master -> destination */
    audio.comp = ctx.createDynamicsCompressor();
    audio.comp.threshold.value = -10;
    audio.comp.knee.value = 6;
    audio.comp.ratio.value = 6;
    audio.comp.attack.value = 0.002;
    audio.comp.release.value = 0.08;
    audio.master = ctx.createGain();
    audio.master.gain.value = level();
    audio.comp.connect(audio.master);
    audio.master.connect(ctx.destination);
    audio.ctx = ctx;
    return ctx;
  }

  /* The library is 8-bit unsigned; Web Audio wants floats in [-1, 1]. Built
     once, synchronously, from base64 — 86k letters, a few milliseconds, and no
     fetch, which file:// would block. */
  function library(ctx) {
    if (audio.buffer) {
      return audio.buffer;
    }
    var bin = win.atob(letters.pcmBase64);
    var buffer = ctx.createBuffer(1, bin.length, letters.sampleRate);
    var channel = buffer.getChannelData(0);
    for (var i = 0; i < bin.length; i += 1) {
      channel[i] = (bin.charCodeAt(i) - 127) / 128;
    }
    audio.buffer = buffer;
    return buffer;
  }

  /* One letter, given the character it stands for. Anything outside A..Z is
     silence — spaces, punctuation and digits are silence in the library too,
     which is why reveal.js paces the line by time and not by sound. */
  Voice.letter = function (char) {
    var ctx = audio.ctx;
    if (!ctx || ctx.state !== "running") {
      return;
    }
    var volume = level();
    if (volume <= 0) {
      return;
    }
    /* Only on a change: assigning the same value every letter is pointless,
       and the getter reads the value last set. */
    if (audio.master.gain.value !== volume) {
      audio.master.gain.value = volume;
    }
    var index = String(char).toUpperCase().charCodeAt(0) - 65;
    if (index < 0 || index > 25) {
      return;
    }

    var source = ctx.createBufferSource();
    source.buffer = library(ctx);
    source.playbackRate.value = PITCH;

    /* The envelope is scheduled against wall time, not buffer time, because
       that is what the player hears: a 75 ms letter at any pitch. `duration` is
       given in buffer seconds, so it is LETTER_SECONDS * PITCH — the same arithmetic
       animalese() uses to read a 75 ms letter out of the library at a stride of
       `pitch`. */
    var fade = Math.min(FADE_MS / 1000, LETTER_SECONDS / 3);
    /* A scheduling lead, so the fade-in is not already in the past by the time
       the source starts; without it the ramp is skipped on a slow frame and the
       click comes back. */
    var start = ctx.currentTime + 0.004;

    var envelope = ctx.createGain();
    if (fade > 0) {
      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(1, start + fade);
      envelope.gain.setValueAtTime(1, start + LETTER_SECONDS - fade);
      envelope.gain.linearRampToValueAtTime(0, start + LETTER_SECONDS);
    } else {
      envelope.gain.setValueAtTime(1, start);
    }

    source.connect(envelope);
    envelope.connect(audio.comp);
    source.start(start, index * letters.secondsPerLetter, LETTER_SECONDS * PITCH);
  };

  /* Called from the first gesture. Browsers will not start audio without one,
     and the story's own first click is the gesture that starts the story. A
     muted player gets no context at all: the listeners stay on, so turning the
     volume up leaves the next gesture to wake the graph. */
  function wake() {
    if (level() <= 0) {
      return;
    }
    var ctx = ensure();
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }
  }

  Voice.wake = wake;
  document.addEventListener("pointerdown", wake, true);
  document.addEventListener("keydown", wake, true);
})();
