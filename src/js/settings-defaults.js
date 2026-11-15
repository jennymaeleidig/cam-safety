/* ===== The tuned defaults for the player settings =====
   One home for the numbers the reveal, the voice, the music and the animations
   were tuned at. settings.js builds the Settings dialog's controls and its
   semantic reads from these specs, and uses the converted values below as its
   fallback when a setting is missing or corrupt. reveal.js, voice.js, music.js
   and stage.js call the settings module and carry no default. Nothing else
   states a tuned default.

   The specs carry the dialog's units: letters a second for Text speed (a
   speed, so higher is faster), percent for Cam volume and Music volume. The
   converted values are derived from the same defaults — milliseconds per
   character, a gain in [0, 1] — so a retune changes one number, not a second
   literal. The flags are toggles: each default is the flag's own value. */
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
  };

  var VOLUME = {
    key: "voiceVolume",
    label: "Cam volume",
    min: 0,
    max: 100,
    step: 5,
    default: 25,
  };

  var CAM_MUTED = {
    key: "camMuted",
    label: "Mute cam",
    default: false,
  };

  var REVEAL = {
    key: "revealEnabled",
    label: "Typewriter text",
    default: true,
  };

  var CAM_ANIMATIONS = {
    key: "camAnimations",
    label: "Cam animations",
    default: true,
  };

  var MUSIC_VOLUME = {
    key: "musicVolume",
    label: "Music volume",
    min: 0,
    max: 100,
    step: 5,
    default: 40,
  };

  var MUSIC_MUTED = {
    key: "musicMuted",
    label: "Mute music",
    default: false,
  };

  var BACKGROUND_ANIMATIONS = {
    key: "backgroundAnimations",
    label: "Background animations",
    default: true,
  };

  win.CamSettingsDefaults = {
    speed: SPEED,
    volume: VOLUME,
    camMuted: CAM_MUTED,
    reveal: REVEAL,
    camAnimations: CAM_ANIMATIONS,
    musicVolume: MUSIC_VOLUME,
    musicMuted: MUSIC_MUTED,
    backgroundAnimations: BACKGROUND_ANIMATIONS,
    /* The Reveal's tuned fallback. */
    msPerChar: 1000 / SPEED.default,
    /* The Voice's tuned fallback. */
    letterGain: VOLUME.default / 100,
    /* The Music's tuned fallback, before mute is applied. */
    musicGain: MUSIC_VOLUME.default / 100,
  };
})();
