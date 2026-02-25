(function () {
  "use strict";

  window.addEventListener("message", function (e) {
    if (!e.data || e.data.type !== "ttt-embed-resize") return;
    var iframes = document.querySelectorAll("iframe.ttt-embed");
    for (var i = 0; i < iframes.length; i++) {
      try {
        if (iframes[i].contentWindow === e.source) {
          iframes[i].style.height = e.data.height + "px";
        }
      } catch (_) {
        /* cross-origin — skip */
      }
    }
  });
})();
