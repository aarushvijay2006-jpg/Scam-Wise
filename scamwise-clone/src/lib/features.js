// features.js - lightweight URL/text feature extraction for backend + local rules.
(function () {
  function urlFeatures(urlStr) {
    const out = { host: "", protocol: "", len: 0, hyphens: 0, dots: 0, hasAt: false, isIp: false };
    try {
      const u = new URL(urlStr);
      out.host = u.hostname.toLowerCase();
      out.protocol = u.protocol;
      out.len = urlStr.length;
      out.hyphens = (out.host.match(/-/g) || []).length;
      out.dots = (out.host.match(/\./g) || []).length;
      out.hasAt = urlStr.includes("@");
      out.isIp = /^\d+\.\d+\.\d+\.\d+$/.test(out.host);
    } catch (e) {
      out.len = String(urlStr || "").length;
    }
    return out;
  }

  function textFeatures(text) {
    const t = String(text || "");
    return {
      len: t.length,
      lower: t.toLowerCase().slice(0, 4000),
      hasShouting: /[A-Z]{10,}/.test(t),
      hasBangs: /!!!+/.test(t)
    };
  }

  function buildPayload(url, text) {
    return { url: String(url || ""), text: String(text || "").slice(0, 8000) };
  }

  const Features = { urlFeatures, textFeatures, buildPayload };
  if (typeof self !== "undefined") self.ScamWiseFeatures = Features;
  if (typeof globalThis !== "undefined") globalThis.ScamWiseFeatures = Features;
})();
