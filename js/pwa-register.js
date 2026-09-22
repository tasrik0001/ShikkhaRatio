(function () {
  "use strict";

  if (!("serviceWorker" in navigator)) {
    return;
  }

  var protocol = window.location.protocol;
  if (protocol !== "https:" && protocol !== "http:") {
    return;
  }

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {
      // Registration is optional. The site works fully without it.
    });
  });
})();
