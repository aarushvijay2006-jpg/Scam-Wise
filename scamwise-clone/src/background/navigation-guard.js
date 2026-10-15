// navigation-guard.js - webNavigation hook, delegates to orchestrator. Fail-open.
(function () {
  function isSkippable(url) {
    return (
      !url ||
      url.startsWith("chrome://") ||
      url.startsWith("chrome-extension://") ||
      url.startsWith("about:") ||
      url.startsWith("edge://") ||
      url.startsWith("brave://")
    );
  }

  function register() {
    if (!chrome.webNavigation || !chrome.webNavigation.onBeforeNavigate) return;
    if (globalThis.__scamwiseGuardRegistered) return;
    globalThis.__scamwiseGuardRegistered = true;

    chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
      try {
        if (details.frameId !== 0) return;
        const url = details.url;
        if (isSkippable(url)) return;
        // Skip our own warning page to avoid redirect loops.
        if (url.includes("src/warning/warning.html")) return;
        const O = (typeof self !== "undefined" && self.ScamWiseOrchestrator) ||
          (typeof globalThis !== "undefined" && globalThis.ScamWiseOrchestrator);
        if (!O) return;
        const result = await O.analyzeUrl(url, "");
        await O.maybeRedirect(details.tabId, url, result);
      } catch (e) {
        // fail-open: never break browsing
      }
    });
  }

  const NavGuard = { register };
  if (typeof self !== "undefined") self.ScamWiseNavGuard = NavGuard;
  if (typeof globalThis !== "undefined") globalThis.ScamWiseNavGuard = NavGuard;
})();
