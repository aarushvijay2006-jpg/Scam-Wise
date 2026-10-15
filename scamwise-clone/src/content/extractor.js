// extractor.js - extracts visible page text and asks background for deeper analysis.
(function () {
  function extractText() {
    try {
      const body = document.body ? document.body.innerText : "";
      return String(body || "").slice(0, 8000);
    } catch (e) {
      return "";
    }
  }

  function run() {
    try {
      if (window.location.href.startsWith("chrome-extension://")) return;
      const text = extractText();
      // Local quick check for banner (no network).
      let local = null;
      try {
        const R = (typeof window !== "undefined" && window.ScamWiseRules) || globalThis.ScamWiseRules;
        if (R) local = R.analyze(window.location.href, text);
      } catch (e) {
        local = null;
      }
      try {
        window.__scamwiseLocal = local;
      } catch (e) {
        // ignore
      }
      // Ask background (backend + cache + redirect).
      try {
        chrome.runtime.sendMessage(
          { type: "SCAMWISE_ANALYZE_TEXT", url: window.location.href, text },
          () => {
            if (chrome.runtime.lastError) return;
          }
        );
      } catch (e) {
        // fail-open
      }
    } catch (e) {
      // fail-open
    }
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(run, 500);
  } else {
    document.addEventListener("DOMContentLoaded", () => setTimeout(run, 500));
  }
})();
