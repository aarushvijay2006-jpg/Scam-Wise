// Small shared helpers (no DOM dependency so service worker can load it).
(function () {
  function safeHostname(urlStr) {
    try {
      return new URL(urlStr).hostname.toLowerCase();
    } catch (e) {
      return "";
    }
  }

  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }

  function levelFor(score, levels) {
    const lv = levels || { CRITICAL: 76, HIGH: 51, MEDIUM: 26 };
    if (score >= lv.CRITICAL) return "Critical";
    if (score >= lv.HIGH) return "High";
    if (score >= lv.MEDIUM) return "Medium";
    return "Low";
  }

  function truncate(s, n) {
    const str = String(s || "");
    return str.length > n ? str.slice(0, n) : str;
  }

  const Utils = { safeHostname, clamp, levelFor, truncate };
  if (typeof self !== "undefined") self.ScamWiseUtils = Utils;
  if (typeof globalThis !== "undefined") globalThis.ScamWiseUtils = Utils;
})();
