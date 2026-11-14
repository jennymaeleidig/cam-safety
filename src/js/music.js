/* ===== Background music: one looping track at a time, selected by passage =====
   The story's background layer, separate from Cam's Voice. One track plays at
   a time, and a track change crossfades: the new song starts on the idle media
   element while the old one fades out of the other.

   A passage selects a track on the passage-render lifecycle, after the
   passage has run its own <<set_layout>> and before it is displayed, and the
   selection is published as body[data-track] -- the same seam idiom as
   data-layout and data-stage-mode. TITLE_TRACK names the title explicitly;
   every other passage reads the published layout's entry in LAYOUT_TRACK.
   Layout 3 names its own distorted track. A same-track selection leaves the
   elements alone; a different one begins a crossfade.

   The gain is window.CamSettings.musicGain(), a gain in [0, 1], read through
   Music.refreshGain() when a music setting changes. Each element's volume is
   that gain scaled by its share of the crossfade. Zero pauses both; a positive
   value plays the incoming track, so a muted or zero-volume pair freezes in
   place and resumes there.

   Autoplay: if play() rejects, a one-shot pointer or key listener retries on
   the first gesture. A muted player is paused rather than waiting on that
   rejection; its unmute press is the gesture that starts it.

   Assets are relative to the built story.html and copied beside it by the
   build (assets: copy), so the tracks play from file://. */
(function () {
  "use strict";

  var win = /** @type {any} */ (window);
  var Music = /** @type {any} */ (win.Music = win.Music || {});

  /* The track table: id -> asset. */
  var TRACKS = {
    theme: {
      src: "music/theme-of-jamil-romancing-saga.mp3",
    },
    distorted: {
      src: "music/theme-of-jamil-romancing-saga-distorted.mp3",
    },
  };

  /* One entry per layout, in layout order. The System layout keeps the theme
     of Layout 0, the composition it copies. */
  var LAYOUT_TRACK = ["theme", "theme", "theme", "distorted", "theme"];
  var TITLE_TRACK = "theme";

  /* How long the outgoing and incoming tracks overlap, in milliseconds. */
  var CROSSFADE_MS = 1200;

  /* The two media elements in the story chrome. A player's level is its share
     of the current mix: 1 for the track on its own, and the fade's two halves
     while a change is in flight. */
  var players = ["music", "music-b"]
    .map(function (id) {
      var el = /** @type {HTMLAudioElement} */ (
        document.getElementById(id)
      );
      return el ? { el: el, level: 0 } : null;
    })
    .filter(function (player) {
      return player !== null;
    });
  var currentTrack = null;
  var lead = null;
  var fade = null;
  var armed = false;

  /* The player's music gain, from the settings module. Missing or not yet
     loaded settings mean silence, never a guessed level. */
  function gain() {
    var settings = win.CamSettings;
    return settings && typeof settings.musicGain === "function"
      ? settings.musicGain()
      : 0;
  }

  function stamp() {
    return typeof win.performance === "object" ? win.performance.now() : Date.now();
  }

  function other(player) {
    return players[0] === player ? players[1] : players[0];
  }

  /* Write each element's volume: the player gain scaled by its level. Zero
     pauses the pair rather than playing silently, so mute and a zero volume
     both freeze the tracks where they are. */
  function applyLevels() {
    var level = Math.min(1, Math.max(0, gain()));
    players.forEach(function (player) {
      player.el.volume = level * player.level;
      if (level <= 0) {
        player.el.pause();
      }
    });
  }

  /* Stop using an element: drop its share, its volume and its source, so a
     track that has faded out holds no playback state. */
  function release(player) {
    player.level = 0;
    player.el.volume = 0;
    player.el.pause();
    player.el.removeAttribute("src");
  }

  /* Finish a crossfade at once, landing the incoming track and releasing the
     outgoing one. */
  function settle() {
    if (!fade) {
      return;
    }
    var state = fade;
    fade = null;
    if (state.frame) {
      win.cancelAnimationFrame(state.frame);
    }
    state.to.level = 1;
    release(state.from);
    applyLevels();
  }

  function stopAll() {
    var state = fade;
    fade = null;
    if (state && state.frame) {
      win.cancelAnimationFrame(state.frame);
    }
    players.forEach(release);
    lead = null;
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
    if (!players.length) {
      return;
    }
    if (!track) {
      stopAll();
      currentTrack = null;
      return;
    }
    if (currentTrack === id) {
      refreshGain();
      return;
    }
    currentTrack = id;

    /* Settle a fade still in flight: its pair owns both elements, and the one
       fading in is about to be reused for the new track. */
    settle();

    var previous = lead;
    var incoming = previous ? other(previous) : players[0];
    incoming.level = 0;
    incoming.el.volume = 0;
    incoming.el.setAttribute("src", track.src);
    lead = incoming;

    if (previous) {
      beginFade(previous, incoming);
    } else {
      incoming.level = 1;
      applyLevels();
    }
    tryPlay(incoming);
  }

  /* Overlap the two players over CROSSFADE_MS: their levels move in opposite
     directions, and every frame rewrites the volumes through the gain. */
  function beginFade(from, to) {
    var state = { from: from, to: to, start: stamp(), frame: 0 };
    fade = state;

    function step() {
      if (fade !== state) {
        return;
      }
      var progress = Math.min(1, (stamp() - state.start) / CROSSFADE_MS);
      state.to.level = progress;
      state.from.level = 1 - progress;
      applyLevels();
      if (progress < 1) {
        state.frame = win.requestAnimationFrame(step);
      } else {
        fade = null;
        release(state.from);
      }
    }

    state.frame = win.requestAnimationFrame(step);
  }

  /* The settings contract's hook: called whenever a music setting changes. */
  function refreshGain() {
    applyLevels();
    if (gain() > 0) {
      tryPlay(lead);
    }
  }

  Music.refreshGain = refreshGain;

  function tryPlay(player) {
    if (!player || !currentTrack || gain() <= 0) {
      return;
    }
    var started = player.el.play();
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
    tryPlay(lead);
  }

  /* The title selects the title track; every other passage selects its
     published layout's track. A passage's <<set_layout>> runs while the
     passage renders, so the render phase -- not the start phase -- is the
     first point at which data-layout names the incoming passage's layout. A
     missing or non-finite value falls back to Layout 0, the layout fallback. */
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

  stage.onPassageRender(function (ctx) {
    select(trackFor(ctx.tags));
  });
})();
