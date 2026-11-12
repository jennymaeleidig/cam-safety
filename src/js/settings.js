/* ===== The player's knobs: how fast the reveal runs, how loud the voice is =====
   Two ranges in SugarCube's own Settings dialog — the rail's Settings button,
   UI.settings() — because that dialog is native to the story format and already
   saves to the browser. Nothing here draws a control: SugarCube reads these
   definitions when it builds the dialog, and reveal.js and voice.js read the
   values back by name.

   Registered from story JavaScript rather than from StoryInit because of when
   SugarCube loads settings: Setting.init() runs after the story's scripts and
   before the init passages, so a definition added here is a definition init()
   will load a saved value for. Added from StoryInit they would arrive after
   that load, and every saved value would be ignored until the dialog was
   opened, whose build is the only thing that applies a default for a setting
   with no value.

   Names are the glossary's: the Reveal and the Voice. Units are the dialogs':
   letters a second (a speed, so higher is faster, which is also the direction
   of a range input's left-to-right) and percent for the volume. Their defaults
   are the numbers the reveal was tuned and measured at — 62.5 letters a second
   is 16 ms per character, and 25 % is the gain of 0.25 — so the story opens at
   the settings the measurements in docs/research/animalese-typewriter.md §7
   describe. */
(function () {
  "use strict";

  var Setting = /** @type {any} */ (window).SugarCube.Setting;

  Setting.addHeader(
    "Cam",
    "Cam's line arrives a letter at a time. How fast it arrives, and how loud.",
  );

  Setting.addRange("revealSpeed", {
    label: "Text speed",
    desc:
      "Letters a second: higher is faster. No effect when your system asks for reduced motion, which arrives the whole line at once.",
    min: 25,
    max: 125,
    step: 12.5,
    default: 62.5,
  });

  Setting.addRange("voiceVolume", {
    label: "Letter volume",
    desc:
      "The sound under Cam's letters, against the background. At zero the letters are silent and the line still reveals.",
    min: 0,
    max: 100,
    step: 5,
    default: 25,
  });
})();
