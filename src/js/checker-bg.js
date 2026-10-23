/* ===== Animated checkerboard background: injection + variable-driven palette ===== */
(function () {
  "use strict";

  function hueForPressure(pressure) {
    // Green only for now.
    // To extend later, e.g. drift green -> red as pressure rises:
    //   return 152 - Math.min(pressure, 20) * 6;
    return 152;
  }

  function applyPalette() {
    var pressure =
      (window.State && State.variables && State.variables.pressure) || 0;
    document.documentElement.style.setProperty(
      "--tmem-hue",
      String(hueForPressure(pressure)),
    );
  }

  function apply() {
    // Inject the background layer once.
    if (!document.getElementById("tmem-bg")) {
      var layer = document.createElement("div");
      layer.id = "tmem-bg";
      layer.innerHTML = '<div class="pattern"></div>';
      document.body.insertBefore(layer, document.body.firstChild);
    }

    applyPalette();

    // Re-derive the palette on every passage change.
    if (window.jQuery) {
      jQuery(document)
        .off(":passageinit.tmembg")
        .on(":passageinit.tmembg", applyPalette);
    }
  }

  if (window.jQuery && window.State) {
    apply();
  } else {
    document.addEventListener("DOMContentLoaded", apply);
  }
})();
