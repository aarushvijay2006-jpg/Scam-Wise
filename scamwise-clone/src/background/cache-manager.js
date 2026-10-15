// cache-manager.js - 24h chrome.storage.local cache + whitelist + history.
(function () {
  function cfg() {
    const C = (typeof self !== "undefined" && self.ScamWiseConstants) ||
      (typeof globalThis !== "undefined" && globalThis.ScamWiseConstants);
    return C || { CACHE_TTL_MS: 86400000, HISTORY_LIMIT: 100 };
  }

  function cacheKey(host) {
    return "cache_" + host;
  }

  async function getCached(host) {
    const c = cfg();
    const data = await chrome.storage.local.get(cacheKey(host));
    const entry = data[cacheKey(host)];
    if (!entry) return null;
    if (Date.now() - entry.ts > c.CACHE_TTL_MS) return null;
    return entry.result;
  }

  async function setCached(host, result) {
    await chrome.storage.local.set({ [cacheKey(host)]: { ts: Date.now(), result } });
  }

  async function isWhitelisted(host) {
    const data = await chrome.storage.local.get("wl_" + host);
    return Boolean(data["wl_" + host] && data["wl_" + host] > Date.now());
  }

  async function setWhitelisted(host, ttlMs) {
    const c = cfg();
    await chrome.storage.local.set({ ["wl_" + host]: Date.now() + (ttlMs || c.WHITELIST_TTL_MS || 86400000) });
  }

  async function appendHistory(item) {
    const c = cfg();
    const data = await chrome.storage.local.get("history");
    const history = Array.isArray(data.history) ? data.history : [];
    history.unshift(item);
    await chrome.storage.local.set({ history: history.slice(0, c.HISTORY_LIMIT || 100) });
  }

  async function cleanupExpired() {
    const all = await chrome.storage.local.get(null);
    const removals = [];
    for (const k of Object.keys(all)) {
      if (k.startsWith("wl_") && all[k] < Date.now()) removals.push(k);
      if (k.startsWith("cache_") && all[k] && Date.now() - all[k].ts > cfg().CACHE_TTL_MS) removals.push(k);
    }
    if (removals.length) await chrome.storage.local.remove(removals);
  }

  const CacheManager = { getCached, setCached, isWhitelisted, setWhitelisted, appendHistory, cleanupExpired };
  if (typeof self !== "undefined") self.ScamWiseCache = CacheManager;
  if (typeof globalThis !== "undefined") globalThis.ScamWiseCache = CacheManager;
})();
