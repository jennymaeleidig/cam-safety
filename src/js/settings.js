/* ===== The player's knobs: how fast the reveal runs, how loud the voice is =====
   This file is the whole contract for the two settings. It owns their stored
   names, labels, units, ranges, tuned defaults, fallbacks and the conversions
   their consumers need — SugarCube's Settings dialog reads the same constants
   that the semantic reads below use, so a rename or a retune is one edit.

   The interface is semantic, and is the only thing reveal.js and voice.js use:

     window.CamSettings.msPerChar()  milliseconds per character (Reveal asks)
     window.CamSettings.letterGain() gain in [0, 1] (Voice asks)

   Neither consumer knows letters a second or percent, and neither carries its
   own copy of a setting's default.

   Two ranges in SugarCube's own Settings dialog — the rail's Settings button,
   UI.settings() — because that dialog is native to the story format and already
   saves to the browser. Nothing here draws a control: SugarCube reads these
   definitions when it builds the dialog.

   Registered from story JavaScript rather than from StoryInit because of when
   SugarCube loads settings: Setting.init() runs after the story's scripts and
   before the init passages, so a definition added here is a definition init()
   will load a saved value for. Added from StoryInit they would arrive after
   that load, and every saved value would be ignored until the dialog was
   opened, whose build is the only thing that applies a default for a setting
   with no value.

   Units are the dialog's: letters a second (a speed, so higher is faster, which
   is also the direction of a range input's left-to-right) and percent for the
   volume. The defaults are the numbers the reveal was tuned and measured at —
   62.5 letters a second is 16 ms per character, and 25 % is the gain of 0.25 —
   so the story opens at the settings the measurements in
   docs/research/animalese-typewriter.md §7 describe.

   Fallbacks: a setting that is missing, non-finite or unreadable (an editor
   preview, or a build without SugarCube's settings) falls back to the tuned
   default. A finite value outside the dialog's range is clamped to it. */
(function () {
  "use strict";

  var win = /** @type {any} */ (window);
  var Setting = win.SugarCube.Setting;

  /* The contract. Both the dialog definitions and the semantic reads below
     take their names, ranges and defaults from here. */
  var SPEED = {
    key: "revealSpeed",
    label: "Text speed",
    min: 25,
    max: 125,
    step: 12.5,
    fallback: 62.5,
    desc:
      "Letters a second: higher is faster. No effect when your system asks for reduced motion, which arrives the whole line at once.",
  };

  var VOLUME = {
    key: "voiceVolume",
    label: "Letter volume",
    min: 0,
    max: 100,
    step: 5,
    fallback: 25,
    desc:
      "The sound under Cam's letters, against the background. At zero the letters are silent and the line still reveals.",
  };

  Setting.addHeader(
    "Cam",
    "Cam's line arrives a letter at a time. How fast it arrives, and how loud.",
  );

  Setting.addRange(SPEED.key, {
    label: SPEED.label,
    desc: SPEED.desc,
    min: SPEED.min,
    max: SPEED.max,
    step: SPEED.step,
    default: SPEED.fallback,
  });

  Setting.addRange(VOLUME.key, {
    label: VOLUME.label,
    desc: VOLUME.desc,
    min: VOLUME.min,
    max: VOLUME.max,
    step: VOLUME.step,
    default: VOLUME.fallback,
  });

  /* A setting's value, normalised to its range, or the tuned default.
     SugarCube replaces its settings object when it loads saved values, so ask
     it rather than reading the object once. */
  function read(spec) {
    var sc = win.SugarCube;
    var get = sc && sc.Setting && sc.Setting.getValue;
    var raw = get ? get(spec.key) : undefined;
    var value = NaN;
    if (typeof raw === "number") {
      value = raw;
    } else if (typeof raw === "string" && raw.trim() !== "") {
      value = Number(raw);
    }
    if (!isFinite(value)) {
      return spec.fallback;
    }
    return Math.min(spec.max, Math.max(spec.min, value));
  }

  var CamSettings = (win.CamSettings = win.CamSettings || {});

  /* The Reveal's unit: how long one character stays on screen. */
  CamSettings.msPerChar = function () {
    return 1000 / read(SPEED);
  };

  /* The Voice's unit: a gain, silence at zero. */
  CamSettings.letterGain = function () {
    return read(VOLUME) / 100;
  };
})();
