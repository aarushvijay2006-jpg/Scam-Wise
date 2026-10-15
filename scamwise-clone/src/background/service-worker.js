// service-worker.js - MV3 background entry. Uses importScripts (no modules needed).
try {
  importScripts(
    "../lib/constants.js",
    "../lib/utils.js",
    "../lib/features.js",
    "../lib/rules-engine.js",
    "../lib/scoring.js",
    "./cache-manager.js",
    "./orchestrator.js",
    "./navigation-guard.js"
  );
} catch (e) {
  // If imports fail, worker stays alive but fail-open.
}

try {
  const Guard = (typeof self !== "undefined" && self.ScamWiseNavGuard) || null;
  if (Guard) Guard.register();
} catch (e) {
  // fail-open
}

// Re-check page text sent from content script (deeper analysis after load).
try {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
      if (!msg || msg.type !== "SCAMWISE_ANALYZE_TEXT") return;
      const O = (typeof self !== "undefined" && self.ScamWiseOrchestrator) || null;
      if (!O) {
        sendResponse({ ok: false });
        return;
      }
      const url = msg.url || (sender.tab && sender.tab.url) || "";
      // Skip warning page loop.
      if (url.includes("src/warning/warning.html")) {
        sendResponse({ ok: true, skipped: true });
        return;
      }
      const result = await O.analyzeUrl(url, msg.text || "");
      // Only redirect on content-phase if score is high; navigation guard already ran.
      if (sender.tab && sender.tab.id !== undefined) {
        await O.maybeRedirect(sender.tab.id, url, result);
      }
      sendResponse({ ok: true, result });
    })();
    return true; // async response
  });
} catch (e) {
  // fail-open
}

// Periodic cleanup of expired whitelist/cache entries.
try {
  chrome.alarms.create("scamwise-cleanup", { periodInMinutes: 60 });
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== "scamwise-cleanup") return;
    try {
      const Cache = (typeof self !== "undefined" && self.ScamWiseCache) || null;
      if (Cache) await Cache.cleanupExpired();
    } catch (e) {
      // ignore
    }
  });
} catch (e) {
  // alarms unavailable: ignore
}
