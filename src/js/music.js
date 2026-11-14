/* ===== Background music: one looping track, selected by passage =====
   The story's background layer, separate from Cam's Voice. One media element
   owns the music: this file writes its source, playback and volume.

   A passage selects a track on the passage-start lifecycle, before it renders,
   and the selection is published as body[data-track] -- the same seam idiom as
   data-layout and data-stage-mode. TITLE_TRACK names the title explicitly;
   every other passage reads the published layout's entry in LAYOUT_TRACK.
   Layout 3 currently names the same track as the title. A same-track selection
   leaves the element alone; a different one swaps the source.

   The gain is window.CamSettings.musicGain(), a gain in [0, 1], read through
   Music.refreshGain() when a music setting changes. Zero pauses; a positive
   value plays, so a muted or zero-volume track freezes in place and resumes
   there.

   Autoplay: if play() rejects, a one-shot pointer or key listener retries on
   the first gesture. A muted player is paused rather than waiting on that
   rejection; its unmute press is the gesture that starts it.

   Assets are relative to the built story.html and copied beside it by the
   build (assets: copy), so the track plays from file://. */
(function () {
  "use strict";

  var win = /** @type {any} */ (window);
  var Music = /** @type {any} */ (win.Music = win.Music || {});

  /* The track table: id -> asset. Layout 3 reuses the title's track until its
     own song exists. */
  var TRACKS = {
    theme: {
      src: "music/theme-of-jamil-romancing-saga.mp3",
    },
  };

  /* One entry per layout, in layout order. */
  var LAYOUT_TRACK = ["theme", "theme", "theme", "theme"];
  var TITLE_TRACK = "theme";

  /* The one audio element in the story chrome. */
  var element = /** @type {HTMLAudioElement} */ (
    document.getElementById("music")
  );
  var currentTrack = null;
  var armed = false;

  /* The player's music gain, from the settings module. Missing or not yet
     loaded settings mean silence, never a guessed level. */
  function gain() {
    var settings = win.CamSettings;
    return settings && typeof settings.musicGain === "function"
      ? settings.musicGain()
      : 0;
  }

  /* Publish the selection. A passage with no track removes the attribute
     rather than leaving the previous one claiming to be current. */
  function select(id) {
    var track = id && TRACKS[id];
    if (track) {
      document.body.setAttribute("data-track", id);
    } else {
      document.body.removeAttribute("data-track");
    }
    if (!element) {
      return;
    }
    if (!track) {
      element.pause();
      element.removeAttribute("src");
      currentTrack = null;
      return;
    }
    if (currentTrack === id) {
      refreshGain();
      return;
    }
    currentTrack = id;
    element.setAttribute("src", track.src);
    refreshGain();
  }

  /* Apply the player's gain. Zero pauses rather than playing silently: mute
     and a zero volume both freeze the track, and lifting either resumes it
     from the same position. */
  function refreshGain() {
    if (!element) {
      return;
    }
    var level = gain();
    element.volume = Math.min(1, Math.max(0, level));
    if (level <= 0) {
      element.pause();
    } else {
      tryPlay();
    }
  }

  /* The settings contract's hook: called whenever a music setting changes. */
  Music.refreshGain = refreshGain;

  function tryPlay() {
    if (!element || !currentTrack || gain() <= 0) {
      return;
    }
    var started = element.play();
    if (started && typeof started.catch === "function") {
      started.catch(arm);
    }
  }

  /* The browser refused to start audio before a gesture. Wait for the first
     pointer or key press, then ask again; the listeners remove themselves. */
  function arm() {
    if (armed) {
      return;
    }
    armed = true;
    document.addEventListener("pointerdown", onGesture, true);
    document.addEventListener("keydown", onGesture, true);
  }

  function onGesture() {
    armed = false;
    document.removeEventListener("pointerdown", onGesture, true);
    document.removeEventListener("keydown", onGesture, true);
    tryPlay();
  }

  /* The title selects the title track; every other passage selects its
     published layout's track. layout.js has already published the layout by
     the time this handler runs (its start handler is registered first), and
     a missing or non-finite value falls back to Layout 0, the layout
     fallback. */
  function trackFor(tags) {
    if (tags && tags.indexOf("title") !== -1) {
      return TITLE_TRACK;
    }
    var layout = Number(document.body.getAttribute("data-layout"));
    if (!isFinite(layout)) {
      layout = 0;
    }
    return LAYOUT_TRACK[layout] || null;
  }

  var stage = win.Stage;

  stage.onPassageStart(function (ctx) {
    select(trackFor(ctx.tags));
  });
})();
