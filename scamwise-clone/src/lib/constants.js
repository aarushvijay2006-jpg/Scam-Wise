// ScamWise constants - shared by background + content scripts.
(function () {
  const Constants = {
    BACKEND_URL: "http://localhost:8000/analyze",
    BACKEND_TIMEOUT_MS: 2000,
    SCORE_THRESHOLD: 51,
    CACHE_TTL_MS: 24 * 60 * 60 * 1000,
    HISTORY_LIMIT: 100,
    WHITELIST_TTL_MS: 24 * 60 * 60 * 1000,
    LEVELS: { CRITICAL: 76, HIGH: 51, MEDIUM: 26 }
  };
  if (typeof self !== "undefined") self.ScamWiseConstants = Constants;
  if (typeof globalThis !== "undefined") globalThis.ScamWiseConstants = Constants;
})();
