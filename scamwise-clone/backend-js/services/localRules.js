export function analyzeLocal(url = "", text = "") {
  url = (url || "").trim(); text = (text || "").trim();
  const reasons = []; const details = {}; let score = 0;
  const add = (pts, r) => { if (pts) { score += pts; reasons.push(r); } };
  let host = "";
  if (url) {
    const cand = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url) ? url : "http://" + url;
    try { host = new URL(cand).hostname.toLowerCase(); } catch { host = ""; }
    details.host = host;
    add(url.length > 75 ? 8 : 0, `long_url(${url.length} chars)`);
    if (url.length > 150) add(7, "very_long_url(>150 chars)");
    if (url.includes("@")) add(15, "'@' in URL (credential smuggling)");
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) add(20, "IP-literal host");
    if (host.includes("xn--")) add(15, "punycode/IDN host");
    if ((host.match(/\./g) || []).length >= 3) add(8, "deep subdomain nesting");
    if ((host.match(/-/g) || []).length >= 2) add(6, "multiple hyphens in host");
    try {
      const u = new URL(cand);
      if (u.port && ![80, 443].includes(Number(u.port))) add(8, `non-standard port :${u.port}`);
      if (u.protocol && u.protocol !== "https:") add(5, "non-https scheme");
      const pq = u.pathname + "?" + u.search;
      if (/%[0-9a-fA-F]{2}.*%[0-9a-fA-F]{2}/.test(pq)) add(6, "heavy percent-encoding");
      if (/(login|signin|verify|secure|account|update|confirm)/i.test(pq) && host) add(5, "sensitive path keywords");
    } catch {}
    const tld = host.includes(".") ? host.rsplit(".").pop() : "";
    if (["zip","mov","tk","ml","ga","cf","gq","buzz","top","xyz","club","info"].includes(tld)) add(10, `suspicious TLD .${tld}`);
    for (const b of ["paypal","apple","amazon","microsoft","google","bank","dhl"]) {
      if ((host.replace(/-/g,"").includes(b) || url.toLowerCase().includes(b)) && !new RegExp(`(^|\\.)${b}\\.(com|net|org|io|gov)$`).test(host)) { add(12, `brand keyword '${b}' in lookalike host`); break; }
    }
    if (/(paypa[l1]|app[l1]e|amaz[o0]n|micr[o0]soft|g[o0]{2}gle)/.test(host)) add(10, "possible homoglyph/typosquat");
  }
  const blob = `${url} ${text}`.toLowerCase();
  const pats = ["urgent","immediat","verify","suspend","locked","expir","action required","congratulations","winner","prize","free.*gift","password.*expir","click here","confirm.*account","limited time","act now","gift.?card","kyc","otp","blocked"];
  const hits = pats.filter(p => { try { return new RegExp(p).test(blob); } catch { return false; } });
  if (hits.length) add(Math.min(25, 6 + 4 * hits.length), `urgency/lure language x${hits.length}`);
  score = Math.max(0, Math.min(100, score));
  return { score, reasons, details: { ...details, tactic_hits: hits.slice(0,10) } };
}
String.prototype.rsplit = String.prototype.rsplit || function(sep){ return this.split(sep); };
