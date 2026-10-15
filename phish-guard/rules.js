// Shared local scoring - no third party, no API key needed.
const URGENCY_WORDS = ["urgent", "immediately", "account suspended", "account blocked", "last warning", "24 hours", "verify now", "action required"];
const GREED_WORDS = ["lottery", "prize", "winner", "refund", "cashback", "kyc", "offer expires"];
const ACTION_WORDS = ["share otp", "send otp", "otp", "click here", "click the link", "send money", "download attachment", "update kyc"];
const BRANDS = ["hdfc", "sbi", "icici", "axis", "paypal", "amazon", "flipkart", "dhl", "rbi", "microsoft", "apple", "google"];
function scoreUrl(urlStr) {
  let score = 0;
  const reasons = [];
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) { score += 30; reasons.push("Uses IP address instead of domain name (+30)"); }
    if (urlStr.includes("@")) { score += 20; reasons.push("Contains '@' trick to hide real domain (+20)"); }
    if (/xn--/.test(host)) { score += 20; reasons.push("Punycode / look-alike characters detected (+20)"); }
    if (/bit\.ly|tinyurl|t\.co|goo\.gl|is\.gd|cutt\.ly/.test(host)) { score += 10; reasons.push("URL shortener hides destination (+10)"); }
    if ((host.match(/-/g) || []).length >= 3) { score += 10; reasons.push("Excessive hyphens in domain (+10)"); }
    if ((host.match(/\./g) || []).length >= 3) { score += 10; reasons.push("Deep subdomains to fake trusted brand (+10)"); }
    if (u.protocol !== "https:") { score += 10; reasons.push("No HTTPS - data sent in plain text (+10)"); }
    if (/\.(tk|top|xyz|cf|gq|ml|pw|cc)$/.test(host)) { score += 10; reasons.push("High-abuse free TLD (+10)"); }
    for (const b of BRANDS) {
      if (host.includes(b) && !host.endsWith(b + ".com") && !host.endsWith(b + ".in") && !host.endsWith(b + "bank.com")) {
        // crude impersonation: brand string but wrong domain
        if (host !== b + ".com") { score += 15; reasons.push("Possible impersonation of '" + b + "' (+15)"); break; }
      }
    }
  } catch (e) {
    score += 5; reasons.push("Malformed URL (+5)");
  }
  return { score, reasons };
}
function scoreText(text) {
  let score = 0;
  const reasons = [];
  const t = (text || "").toLowerCase();
  for (const w of URGENCY_WORDS) if (t.includes(w)) { score += 15; reasons.push("Urgency phrase: \"" + w + "\" (+15)"); break; }
  for (const w of GREED_WORDS) if (t.includes(w)) { score += 10; reasons.push("Lure phrase: \"" + w + "\" (+10)"); break; }
  for (const w of ACTION_WORDS) if (t.includes(w)) { score += 15; reasons.push("Dangerous action request: \"" + w + "\" (+15)"); break; }
  if (/!!!+/.test(text || "") || /[A-Z]{10,}/.test(text || "")) { score += 5; reasons.push("Shouting / excessive punctuation (+5)"); }
  return { score, reasons };
}
function analyze(url, text) {
  const u = scoreUrl(url || "");
  const t = scoreText(text || "");
  const total = Math.min(100, u.score + t.score);
  const level = total >= 76 ? "Critical" : total >= 51 ? "High" : total >= 26 ? "Medium" : "Low";
  return { score: total, level, reasons: [...u.reasons, ...t.reasons] };
}
// expose for service worker + content script
if (typeof self !== "undefined") { self.PhishRules = { analyze, scoreUrl, scoreText }; }
if (typeof globalThis !== "undefined") { globalThis.PhishRules = { analyze, scoreUrl, scoreText }; }
