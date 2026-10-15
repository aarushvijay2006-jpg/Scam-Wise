// scoring.js - normalizes backend + local scores into one {score, level, reasons, source}.
(function () {
  function normalize(raw, fallbackLevel) {
    const score = Math.min(
      100,
      Math.max(0, Math.round(Number(raw && raw.score) || 0))
    );
    let level = raw && raw.level;
    const valid = ["Low", "Medium", "High", "Critical"];
    if (!valid.includes(level)) {
      try {
        const C = (typeof self !== "undefined" && self.ScamWiseConstants) ||
          (typeof globalThis !== "undefined" && globalThis.ScamWiseConstants);
        const U = (typeof self !== "undefined" && self.ScamWiseUtils) ||
          (typeof globalThis !== "undefined" && globalThis.ScamWiseUtils);
        level = U ? U.levelFor(score, C && C.LEVELS) : fallbackLevel || "Low";
      } catch (e) {
        level = fallbackLevel || "Low";
      }
    }
    const reasons = Array.isArray(raw && raw.reasons) ? raw.reasons.map(String) : [];
    const source = (raw && raw.source) || "local";
    return { score, level, reasons, source };
  }

  function combine(localResult, remoteResult) {
    // Prefer remote when present; otherwise local. Keep fail-open semantics.
    if (remoteResult) return normalize({ ...remoteResult, source: remoteResult.source || "backend" });
    if (localResult) return normalize({ ...localResult, source: "local" });
    return { score: 0, level: "Low", reasons: [], source: "local" };
  }

  const Scoring = { normalize, combine };
  if (typeof self !== "undefined") self.ScamWiseScoring = Scoring;
  if (typeof globalThis !== "undefined") globalThis.ScamWiseScoring = Scoring;
})();
