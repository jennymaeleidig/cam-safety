/* ===== The player's knobs: reveal pace, letter loudness, music =====
   This file is the settings contract. settings-defaults.js holds the tuned
   specs — stored names, labels, units, ranges and defaults — and this file
   builds SugarCube's dialog definitions and the semantic reads from them, so a
   rename or a retune is one edit.

   The interface is semantic, and is the only thing reveal.js, voice.js and
   music.js use:

     window.CamSettings.msPerChar()   milliseconds per character (Reveal asks)
     window.CamSettings.letterGain()  gain in [0, 1] (Voice asks)
     window.CamSettings.musicGain()   gain in [0, 1], zero when muted (Music asks)

   No consumer knows letters a second, percent or a mute flag, and none
   carries its own copy of a setting's default or a fallback branch. This
   module is always defined; the fallback rule lives inside it.

   Three ranges and a toggle in SugarCube's own Settings dialog — the rail's
   Settings button, UI.settings() — because that dialog is native to the story
   format and already saves to the browser. Nothing here draws a control:
   SugarCube reads these definitions when it builds the dialog.

   Registered from story JavaScript rather than from StoryInit because of when
   SugarCube loads settings: Setting.init() runs after the story's scripts and
   before the init passages, so a definition added here is a definition init()
   will load a saved value for. Added from StoryInit they would arrive after
   that load, and every saved value would be ignored until the dialog was
   opened, whose build is the only thing that applies a default for a setting
   with no value.

   Units are the dialog's: letters a second (a speed, so higher is faster, which
   is also the direction of a range input's left-to-right), percent for the two
   volumes, and a boolean for music mute. The defaults are the numbers the
   reveal was measured at and the music was tuned to by ear
   (settings-defaults.js), so the story opens as tuned.

   Fallbacks: a setting that is missing, non-finite or unreadable (an editor
   preview, or a build without SugarCube's settings) falls back to the tuned
   default. A finite value outside the dialog's range is clamped to it. A value
   is read as a number only; anything else falls back, and a mute value is read
   as a boolean only. The rule is here, so a consumer asks for a unit and
   receives one.

   Live changes: the music definitions carry an onChange hook that asks the
   music module to re-read its gain, so a volume drag or a mute press is
   audible at once instead of waiting for the next passage. The reveal and the
   voice read their values at use, so they need no hook. */
(function () {
  "use strict";

  var win = /** @type {any} */ (window);
  var defaults = win.CamSettingsDefaults || null;
  var SPEED = defaults && defaults.speed;
  var VOLUME = defaults && defaults.volume;
  var MUSIC_VOLUME = defaults && defaults.musicVolume;
  var MUSIC_MUTED = defaults && defaults.musicMuted;

  var CamSettings = /** @type {any} */ (win.CamSettings = win.CamSettings || {});

  /* A setting's stored value, or undefined when SugarCube is not there. Ask
     SugarCube each time rather than reading the object once: it replaces its
     settings object when it loads saved values. */
  function stored(spec) {
    var sc = win.SugarCube;
    var get = sc && sc.Setting && sc.Setting.getValue;
    return get ? get(spec.key) : undefined;
  }

  /* A setting's value in the dialog's unit, clamped to its range, or null when
     it is missing, unreadable or not a number. Only a number is trusted: a
     non-number is a missing or corrupt value, not something to parse. */
  function read(spec) {
    var value = stored(spec);
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null;
    }
    return Math.min(spec.max, Math.max(spec.min, value));
  }

  /* A toggle's value, or null when it is missing or not a boolean. Only a
     boolean is trusted; a string or a number is a corrupt value, not a
     truthy/falsy answer. */
  function readFlag(spec) {
    var value = stored(spec);
    return typeof value === "boolean" ? value : null;
  }

  /* The Reveal's unit: how long one character stays on screen. The tuned
     default is the converted value in settings-defaults.js. */
  CamSettings.msPerChar = function () {
    if (!SPEED) {
      return 0;
    }
    var speed = read(SPEED);
    return speed == null ? defaults.msPerChar : 1000 / speed;
  };

  /* The Voice's unit: a gain, silence at zero. */
  CamSettings.letterGain = function () {
    if (!VOLUME) {
      return 0;
    }
    var volume = read(VOLUME);
    return volume == null ? defaults.letterGain : volume / 100;
  };

  /* The Music's unit: one gain, silence at zero. Mute folds into the same
     read so the music module never learns the flag exists; the stored volume
     is left untouched, so unmuting returns the player's level. */
  CamSettings.musicGain = function () {
    if (!MUSIC_VOLUME || !MUSIC_MUTED) {
      return 0;
    }
    var muted = readFlag(MUSIC_MUTED);
    if (muted == null ? MUSIC_MUTED.default : muted) {
      return 0;
    }
    var volume = read(MUSIC_VOLUME);
    return volume == null ? defaults.musicGain : volume / 100;
  };

  /* A build without the defaults file has no contract to register and no
     tuned value to fall back to; the semantic reads above stay defined and
     return the silent/fast end of their ranges. */
  var Setting = win.SugarCube && win.SugarCube.Setting;
  if (!Setting || !SPEED || !VOLUME) {
    return;
  }

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
    default: SPEED.default,
  });

  Setting.addRange(VOLUME.key, {
    label: VOLUME.label,
    desc: VOLUME.desc,
    min: VOLUME.min,
    max: VOLUME.max,
    step: VOLUME.step,
    default: VOLUME.default,
  });

  if (!MUSIC_VOLUME || !MUSIC_MUTED) {
    return;
  }

  /* The music module re-reads its gain on either music change. music.js is
     merged earlier than this file, so Music exists by the time a setting can
     change; the guard keeps an editor preview or a partial build quiet. */
  function refreshMusic() {
    var music = win.Music;
    if (music && typeof music.refreshGain === "function") {
      music.refreshGain();
    }
  }

  Setting.addHeader(
    "Music",
    "The background track under the title and the layouts. How loud it is, and whether it plays.",
  );

  Setting.addRange(MUSIC_VOLUME.key, {
    label: MUSIC_VOLUME.label,
    desc: MUSIC_VOLUME.desc,
    min: MUSIC_VOLUME.min,
    max: MUSIC_VOLUME.max,
    step: MUSIC_VOLUME.step,
    default: MUSIC_VOLUME.default,
    onChange: refreshMusic,
  });

  Setting.addToggle(MUSIC_MUTED.key, {
    label: MUSIC_MUTED.label,
    desc: MUSIC_MUTED.desc,
    default: MUSIC_MUTED.default,
    onChange: refreshMusic,
  });
})();
