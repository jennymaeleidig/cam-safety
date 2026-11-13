/* ===== The tuned defaults for the two player settings =====
   One home for the numbers the reveal and the voice were tuned and measured
   at. settings.js builds the Settings dialog's ranges and its semantic reads
   from these specs; reveal.js and voice.js fall back to the converted values
   here only when the settings module itself is absent (an editor preview, or
   a stripped build). Nothing else states a tuned default.

   The specs carry the dialog's units: letters a second for Text speed (a
   speed, so higher is faster) and percent for Letter volume. The converted
   values are derived from the same defaults — milliseconds per character and
   a gain in [0, 1] — so a retune changes one number, not a second literal. */
(function () {
  "use strict";

  var win = /** @type {any} */ (window);

  var SPEED = {
    key: "revealSpeed",
    label: "Text speed",
    min: 25,
    max: 125,
    step: 12.5,
    default: 62.5,
    desc:
      "Letters a second: higher is faster. No effect when your system asks for reduced motion, which arrives the whole line at once.",
  };

  var VOLUME = {
    key: "voiceVolume",
    label: "Letter volume",
    min: 0,
    max: 100,
    step: 5,
    default: 25,
    desc:
      "The sound under Cam's letters, against the background. At zero the letters are silent and the line still reveals.",
  };

  win.CamSettingsDefaults = {
    speed: SPEED,
    volume: VOLUME,
    /* The Reveal's unit. */
    msPerChar: 1000 / SPEED.default,
    /* The Voice's unit. */
    letterGain: VOLUME.default / 100,
  };
})();
