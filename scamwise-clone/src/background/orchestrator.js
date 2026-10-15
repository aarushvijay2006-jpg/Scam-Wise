// orchestrator.js - POSTs to backend with 2s timeout, fail-open, 24h cache, redirect on score>=51.
(function () {
  function constants() {
    return (
      (typeof self !== "undefined" && self.ScamWiseConstants) ||
      (typeof globalThis !== "undefined" && globalThis.ScamWiseConstants) ||
      { BACKEND_URL: "http://localhost:8000/analyze", BACKEND_TIMEOUT_MS: 2000, SCORE_THRESHOLD: 51 }
    );
  }

  async function fetchRemote(url, text) {
    const C = constants();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), C.BACKEND_TIMEOUT_MS || 2000);
    try {
      const res = await fetch(C.BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, text: (text || "").slice(0, 8000) }),
        signal: ctrl.signal
      });
      if (!res.ok) return null;
      const data = await res.json();
      // backend returns {verdict, signals} - unwrap verdict, never hardcode score
      const v = data && data.verdict ? { ...data.verdict, signals: data.signals } : data;
      return v;
    } catch (e) {
      return null; // fail-open: network error, timeout, backend down
    } finally {
      clearTimeout(timer);
    }
  }

  function localAnalyze(url, text) {
    const R = (typeof self !== "undefined" && self.ScamWiseRules) ||
      (typeof globalThis !== "undefined" && globalThis.ScamWiseRules);
    if (R && typeof R.analyze === "function") return { ...R.analyze(url, text), source: "local" };
    return { score: 0, level: "Low", reasons: [], source: "local" };
  }

  function normalizeResult(raw, source) {
    const S = (typeof self !== "undefined" && self.ScamWiseScoring) ||
      (typeof globalThis !== "undefined" && globalThis.ScamWiseScoring);
    if (S) return S.combine(null, { ...raw, source });
    const score = Math.min(100, Math.max(0, Math.round(Number(raw.score) || 0)));
    const level = raw.level || (score >= 76 ? "Critical" : score >= 51 ? "High" : score >= 26 ? "Medium" : "Low");
    return { score, level, reasons: Array.isArray(raw.reasons) ? raw.reasons : [], source };
  }

  async function analyzeUrl(url, text) {
    const C = constants();
    const Cache = (typeof self !== "undefined" && self.ScamWiseCache) ||
      (typeof globalThis !== "undefined" && globalThis.ScamWiseCache);
    let host = "";
    try {
      host = new URL(url).hostname.toLowerCase();
    } catch (e) {
      host = "";
    }

    if (host && Cache && await Cache.isWhitelisted(host)) {
      return { score: 0, level: "Low", reasons: ["Whitelisted by user"], source: "whitelist", whitelisted: true };
    }

    if (host && Cache) {
      const cached = await Cache.getCached(host);
      if (cached) return cached;
    }

    const remote = await fetchRemote(url, text || "");
    let result;
    if (remote) {
      result = normalizeResult(remote, "backend");
    } else {
      result = normalizeResult(localAnalyze(url, text || ""), "local");
    }

    if (host && Cache) {
      await Cache.setCached(host, result);
      await Cache.appendHistory({ url, host, score: result.score, level: result.level, ts: Date.now(), reasons: result.reasons, source: result.source });
    }
    void C;
    return result;
  }

  function warningUrl(url, result) {
    return (
      chrome.runtime.getURL("src/warning/warning.html") +
      "?url=" + encodeURIComponent(url) +
      "&score=" + encodeURIComponent(String(result.score)) +
      "&level=" + encodeURIComponent(result.level || "") +
      "&reasons=" + encodeURIComponent(JSON.stringify(result.reasons || []))
    );
  }

  async function maybeRedirect(tabId, url, result) {
    const C = constants();
    if (result && result.whitelisted) return false;
    if (result && result.score >= (C.SCORE_THRESHOLD || 51)) {
      try {
        await chrome.tabs.update(tabId, { url: warningUrl(url, result) });
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  const Orchestrator = { analyzeUrl, maybeRedirect, warningUrl, fetchRemote };
  if (typeof self !== "undefined") self.ScamWiseOrchestrator = Orchestrator;
  if (typeof globalThis !== "undefined") globalThis.ScamWiseOrchestrator = Orchestrator;
})();
