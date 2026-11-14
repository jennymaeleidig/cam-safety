/* ===== The tuned defaults for the player settings =====
   One home for the numbers the reveal, the voice and the music were tuned at.
   settings.js builds the Settings dialog's controls and its semantic reads
   from these specs, and uses the converted values below as its fallback when
   a setting is missing or corrupt. reveal.js, voice.js and music.js call the
   settings module and carry no default. Nothing else states a tuned default.

   The specs carry the dialog's units: letters a second for Text speed (a
   speed, so higher is faster), percent for Letter volume and Music volume.
   The converted values are derived from the same defaults — milliseconds per
   character, a gain in [0, 1] — so a retune changes one number, not a second
   literal. Music mute is a toggle: its default is the flag's own value. */
(function () {
  "use strict";

  var win = /** @type {any} */ (window);

  var SPEED = {
    key: "revealSpeed",
    label: "Text speed",
    min: 25,
    max: 125,
    step: 12.5,
    default: 50,
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

  var MUSIC_VOLUME = {
    key: "musicVolume",
    label: "Music volume",
    min: 0,
    max: 100,
    step: 5,
    default: 40,
    desc:
      "The background track, under Cam's letter sounds. At zero the music is silent; Mute music silences it without changing this value.",
  };

  var MUSIC_MUTED = {
    key: "musicMuted",
    label: "Mute music",
    default: false,
    desc:
      "Silences the background track without changing Music volume. Unmuting resumes the track where it paused.",
  };

  win.CamSettingsDefaults = {
    speed: SPEED,
    volume: VOLUME,
    musicVolume: MUSIC_VOLUME,
    musicMuted: MUSIC_MUTED,
    /* The Reveal's tuned fallback. */
    msPerChar: 1000 / SPEED.default,
    /* The Voice's tuned fallback. */
    letterGain: VOLUME.default / 100,
    /* The Music's tuned fallback, before mute is applied. */
    musicGain: MUSIC_VOLUME.default / 100,
  };
})();
