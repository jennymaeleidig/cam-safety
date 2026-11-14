/* ===== The tuned defaults for the two player settings =====
   One home for the numbers the reveal and the voice were tuned and measured
   at. settings.js builds the Settings dialog's ranges and its semantic reads
   from these specs, and uses the converted values below as its fallback when
   a setting is missing or corrupt. reveal.js and voice.js call the settings
   module and carry no default. Nothing else states a tuned default.

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
    /* The Reveal's tuned fallback. */
    msPerChar: 1000 / SPEED.default,
    /* The Voice's tuned fallback. */
    letterGain: VOLUME.default / 100,
  };
})();
