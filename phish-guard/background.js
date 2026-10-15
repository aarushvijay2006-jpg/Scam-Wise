// background.js - service worker: blocks BEFORE page JS runs, fully local.
importScripts("rules.js");

const CACHE_DAYS = 1;

async function getCache(host) {
  const d = await chrome.storage.local.get("cache_" + host);
  const e = d["cache_" + host];
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_DAYS * 24 * 3600 * 1000) return null;
  return e.result;
}
async function setCache(host, result) {
  await chrome.storage.local.set({ ["cache_" + host]: { ts: Date.now(), result } });
}
async function isWhitelisted(host) {
  const d = await chrome.storage.local.get("wl_" + host);
  return d["wl_" + host] && d["wl_" + host] > Date.now();
}

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // only top-level page loads, not iframes/images
  if (details.frameId !== 0) return;
  const url = details.url;
  if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("about:")) return;
  try {
    const host = new URL(url).hostname;
    if (await isWhitelisted(host)) return;
    const cached = await getCache(host);
    const result = cached || PhishRules.analyze(url, "");
    if (!cached) await setCache(host, result);

    // save to history for dashboard/popup
    const h = await chrome.storage.local.get("history");
    const history = h.history || [];
    history.unshift({ url, host, score: result.score, level: result.level, ts: Date.now(), reasons: result.reasons });
    await chrome.storage.local.set({ history: history.slice(0, 100) });

    if (result.score >= 51) {
      const warnUrl = chrome.runtime.getURL("warning.html")
        + "?url=" + encodeURIComponent(url)
        + "&score=" + result.score
        + "&level=" + encodeURIComponent(result.level)
        + "&reasons=" + encodeURIComponent(JSON.stringify(result.reasons));
      await chrome.tabs.update(details.tabId, { url: warnUrl });
    }
  } catch (e) { /* fail-open: never break browsing */ }
});

// auto-expire whitelist via alarm
chrome.alarms.create("cleanup", { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener(async () => {
  const all = await chrome.storage.local.get(null);
  for (const k of Object.keys(all)) {
    if (k.startsWith("wl_") && all[k] < Date.now()) await chrome.storage.local.remove(k);
  }
});
