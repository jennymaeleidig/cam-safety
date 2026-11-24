/* ===== The player's knobs: reveal pacing, Cam's volume and motion, and the
   system's music and background =====
   This file is the settings contract. settings-defaults.js holds the tuned
   specs — stored names, labels, units, ranges and defaults — and this file
   builds SugarCube's dialog definitions and the semantic reads from them, so a
   rename or a retune is one edit.

   The interface is semantic, and is the only thing reveal.js, voice.js,
   music.js and stage.js use:

     window.CamSettings.msPerChar()            milliseconds per character (Reveal asks)
     window.CamSettings.letterGain()           gain in [0, 1] (Voice asks)
     window.CamSettings.revealEnabled()        whether to type a line (Reveal asks)
     window.CamSettings.camAnimations()        whether the portrait changes pose (Stage asks)
     window.CamSettings.musicGain()            gain in [0, 1], zero when muted (Music asks)
     window.CamSettings.backgroundAnimations() whether the background scrolls (settings applies)

   No consumer knows letters a second, percent or a mute flag, and each
   guards only against this module being absent. The tuned defaults and the
   fallback rule for a stored value live here.

   Three ranges and five toggles in SugarCube's own Settings dialog — the
   rail's Settings button, UI.settings() — because that dialog is native to the story
   format and already saves to the browser. Nothing here draws a control:
   SugarCube reads these definitions when it builds the dialog. The dialog's
   labels are titles only; no prose is attached to a header or a setting.

   Registered from story JavaScript rather than from StoryInit because of when
   SugarCube loads settings: Setting.init() runs after the story's scripts and
   before the init passages, so a definition added here is a definition init()
   will load a saved value for. Added from StoryInit they would arrive after
   that load, and every saved value would be ignored until the dialog was
   opened, whose build is the only thing that applies a default for a setting
   with no value.

   Units are the dialog's: letters a second (a speed, so higher is faster, which
   is also the direction of a range input's left-to-right), percent for the two
   volumes, and a boolean for every toggle. The defaults are the story's tuned
   opening values: the music and Cam's voice were tuned by ear, and the
   animations were chosen to run (settings-defaults.js), so the story opens
   as tuned.

   Fallbacks: a setting that is missing, non-finite or unreadable (an editor
   preview, or a build without SugarCube's settings) falls back to the tuned
   default. A finite value outside the dialog's range is clamped to it. A value
   is read as a number only; anything else falls back, and a toggle is read as
   a boolean only. The rule is here, so a consumer asks for a unit and receives
   one.

   Live changes: the music definitions carry an onChange hook that asks the
   music module to re-read its gain, so a volume drag or a mute press is
   audible at once instead of waiting for the next passage. The cam-animation
   toggle repaints the portrait from its GIF or its first-frame still, and
   settles a talking portrait back to neutral when it is switched off; the
   background toggle rewrites the body class the stylesheet reads. The reveal
   and the voice read their values at use, so they need no hook. */
(function () {
  "use strict";

  var win = /** @type {any} */ (window);
  var defaults = win.CamSettingsDefaults || null;
  var SPEED = defaults && defaults.speed;
  var VOLUME = defaults && defaults.volume;
  var CAM_MUTED = defaults && defaults.camMuted;
  var REVEAL = defaults && defaults.reveal;
  var CAM_ANIMATIONS = defaults && defaults.camAnimations;
  var MUSIC_VOLUME = defaults && defaults.musicVolume;
  var MUSIC_MUTED = defaults && defaults.musicMuted;
  var BACKGROUND_ANIMATIONS = defaults && defaults.backgroundAnimations;

  var CamSettings = /** @type {any} */ (
    win.CamSettings = win.CamSettings || {}
  );

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

  /* A toggle's value with the tuned default filled in. */
  function flag(spec) {
    if (!spec) {
      return false;
    }
    var value = readFlag(spec);
    return value == null ? spec.default : value;
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

  /* Whether a line arrives a character at a time. Off lands the line whole. */
  CamSettings.revealEnabled = function () {
    return flag(REVEAL);
  };

  /* The Voice's unit: a gain, silence at zero. Cam mute folds into the same
     read so the voice module never learns the flag exists; the stored volume
     is left untouched, so unmuting returns the player's level. */
  CamSettings.letterGain = function () {
    if (!VOLUME) {
      return 0;
    }
    if (flag(CAM_MUTED)) {
      return 0;
    }
    var volume = read(VOLUME);
    return volume == null ? defaults.letterGain : volume / 100;
  };

  /* Whether Cam's portrait changes to its talking pose while he speaks. */
  CamSettings.camAnimations = function () {
    return flag(CAM_ANIMATIONS);
  };

  /* The Music's unit: one gain, silence at zero. Mute folds into the same
     read so the music module never learns the flag exists; the stored volume
     is left untouched, so unmuting returns the player's level. */
  CamSettings.musicGain = function () {
    if (!MUSIC_VOLUME || !MUSIC_MUTED) {
      return 0;
    }
    if (flag(MUSIC_MUTED)) {
      return 0;
    }
    var volume = read(MUSIC_VOLUME);
    return volume == null ? defaults.musicGain : volume / 100;
  };

  /* Whether the checkerboard background scrolls. */
  CamSettings.backgroundAnimations = function () {
    return flag(BACKGROUND_ANIMATIONS);
  };

  /* The stylesheet reads one body class; this is its only writer. Called at
     each passage start, after SugarCube has loaded the saved value, and by
     the toggle's onChange while the dialog is open. */
  function applyBackground() {
    if (!BACKGROUND_ANIMATIONS) {
      return;
    }
    document.body.classList.toggle(
      "no-background-animation",
      !CamSettings.backgroundAnimations(),
    );
  }

  /* A build without the defaults file has no contract to register and no
     tuned value to fall back to; the semantic reads above stay defined and
     return the silent, fast or off end of their ranges. */
  var Setting = win.SugarCube && win.SugarCube.Setting;
  if (!Setting || !SPEED || !VOLUME) {
    return;
  }

  /* One dialog definition from a tuned spec. The spec's key names the stored
     value; SugarCube's definition takes the label and the control's range or
     default. */
  function addRange(spec, onChange) {
    var def = {
      label: spec.label,
      min: spec.min,
      max: spec.max,
      step: spec.step,
      default: spec.default,
    };
    if (onChange) {
      def.onChange = onChange;
    }
    Setting.addRange(spec.key, def);
  }

  function addToggle(spec, onChange) {
    var def = { label: spec.label, default: spec.default };
    if (onChange) {
      def.onChange = onChange;
    }
    Setting.addToggle(spec.key, def);
  }

  Setting.addHeader("Cam");
  addRange(SPEED);
  addRange(VOLUME);

  if (CAM_MUTED) {
    addToggle(CAM_MUTED);
  }

  if (REVEAL) {
    addToggle(REVEAL);
  }

  /* The portrait repaints through the new source rule. Switching animations
     off settles a talking pose to neutral and shows its still; switching them
     on restores the animated GIF. */
  function refreshStage() {
    var stage = win.Stage;
    if (stage && typeof stage.refreshCam === "function") {
      stage.refreshCam();
    }
  }

  if (CAM_ANIMATIONS) {
    addToggle(CAM_ANIMATIONS, refreshStage);
  }

  Setting.addHeader("System");

  if (MUSIC_VOLUME) {
    /* The music module re-reads its gain on a music change. music.js is
       merged earlier than this file, so Music exists by the time a setting can
       change; the guard keeps an editor preview or a partial build quiet. */
    function refreshMusic() {
      var music = win.Music;
      if (music && typeof music.refreshGain === "function") {
        music.refreshGain();
      }
    }

    addRange(MUSIC_VOLUME, refreshMusic);

    if (MUSIC_MUTED) {
      addToggle(MUSIC_MUTED, refreshMusic);
    }
  }

  if (BACKGROUND_ANIMATIONS) {
    addToggle(BACKGROUND_ANIMATIONS, applyBackground);

    var stage = win.Stage;
    if (stage && typeof stage.onPassageStart === "function") {
      stage.onPassageStart(applyBackground);
    }
  }
})();
