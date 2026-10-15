"""Heuristic URL-lexical + linguistic scoring. Pure stdlib, returns 0-100."""
import re
from urllib.parse import urlparse

SUSPICIOUS_TLDS = {
    "zip", "mov", "tk", "ml", "ga", "cf", "gq", "buzz", "top", "xyz",
    "club", "info", "ru", "cn", "br", "quest", "support", "cam",
}
BRAND_KEYWORDS = [
    "paypal", "apple", "amazon", "microsoft", "google", "facebook",
    "instagram", "netflix", "bank", "wellsfargo", "chase", "hsbc",
    "binance", "coinbase", "metamask", "irs", "dhl", "fedex",
]
URGENCY_PATTERNS = [
    r"urgent", r"immediate\w*", r"verify", r"suspend", r"locked?",
    r"expire[sd]?", r"action required", r"unusual activity",
    r"congratulations", r"winner", r"claim.*prize", r"free.*gift",
    r"password.*expir", r"click here", r"confirm.*account",
    r"limited time", r"act now", r"wire transfer", r"gift.?card",
    r"crypto.*doubl", r"guaranteed.*return", r"kyc",
]
SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "cutt.ly"}


def _add(score: int, reasons: list, pts: int, reason: str) -> int:
    if pts:
        score += pts
        reasons.append(reason)
    return score


def analyze_local(url: str = "", text: str = "") -> dict:
    """Score url+text heuristics. Returns {score, reasons, details}."""
    url = (url or "").strip()
    text = (text or "").strip()
    reasons: list[str] = []
    details: dict = {}
    score = 0

    parsed = None
    host = ""
    if url:
        # tolerate missing scheme
        candidate = url if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", url) else "http://" + url
        try:
            parsed = urlparse(candidate)
            host = (parsed.hostname or "").lower()
        except Exception:
            parsed = None
        details["host"] = host

        score = _add(score, reasons, 8 if len(url) > 75 else 0, f"long_url({len(url)} chars)")
        if len(url) > 150:
            score = _add(score, reasons, 7, "very_long_url(>150 chars)")
        if "@" in url:
            score = _add(score, reasons, 15, "'@' in URL (credential smuggling)")
        # IPv4 / IPv6 literal host
        if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", host) or (host.startswith("[") and ":" in host):
            score = _add(score, reasons, 20, "IP-literal host")
        if "xn--" in host:
            score = _add(score, reasons, 15, "punycode/IDN host")
        if host.count(".") >= 3:
            score = _add(score, reasons, 8, "deep subdomain nesting")
        if host.count("-") >= 2:
            score = _add(score, reasons, 6, "multiple hyphens in host")
        if parsed is not None:
            if parsed.port is not None and parsed.port not in (80, 443):
                score = _add(score, reasons, 8, f"non-standard port :{parsed.port}")
            if parsed.scheme and parsed.scheme.lower() != "https":
                score = _add(score, reasons, 5, "non-https scheme")
            path_q = (parsed.path or "") + "?" + (parsed.query or "")
            if re.search(r"%[0-9a-fA-F]{2}.*%[0-9a-fA-F]{2}", path_q):
                score = _add(score, reasons, 6, "heavy percent-encoding")
            if re.search(r"(login|signin|verify|secure|account|update|confirm)", path_q.lower()) and host:
                score = _add(score, reasons, 5, "sensitive path keywords")
        tld = host.rsplit(".", 1)[-1] if "." in host else ""
        if tld in SUSPICIOUS_TLDS:
            score = _add(score, reasons, 10, f"suspicious TLD .{tld}")
        if host in SHORTENERS:
            score = _add(score, reasons, 10, "URL shortener hides destination")
        # brand + unrelated domain (naive lookalike signal)
        low_host = host.replace("-", "")
        for brand in BRAND_KEYWORDS:
            if brand in low_host or brand in url.lower():
                # exact official domains get less weight
                if not re.search(rf"(^|\.){re.escape(brand)}\.(com|net|org|io|gov)$", host):
                    score = _add(score, reasons, 12, f"brand keyword '{brand}' in lookalike host")
                    break
        # lookalike homoglyph / extra-token signal e.g. paypa1, app1e, secure-paypal
        if re.search(r"(paypa[l1]|app[l1]e|amaz[o0]n|micr[o0]soft|g[o0]{2}gle)", host):
            score = _add(score, reasons, 10, "possible homoglyph/typosquat")
        if re.search(r"\d{4,}", url):
            score = _add(score, reasons, 4, "long digit run in URL")
    else:
        details["host"] = ""

    # linguistic layer over text (+ url string too)
    blob = f"{url} {text}".lower()
    tactic_hits: list[str] = []
    for pat in URGENCY_PATTERNS:
        try:
            if re.search(pat, blob):
                tactic_hits.append(pat)
        except re.error:
            continue
    if tactic_hits:
        pts = min(25, 6 + 4 * len(tactic_hits))
        score = _add(score, reasons, pts, f"urgency/lure language x{len(tactic_hits)}")
    details["tactic_hits"] = tactic_hits[:10]
    if re.search(r"!!!+|\$\$\$", text):
        score = _add(score, reasons, 4, "spammy punctuation")
    if re.search(r"(whatsapp|telegram|contact @|dm me)", blob) and re.search(r"(fee|payment|send.*(btc|crypto|gift))", blob):
        score = _add(score, reasons, 12, "off-platform payment request")

    score = max(0, min(100, score))
    details.update({"url_len": len(url), "text_len": len(text)})
    return {"score": score, "reasons": reasons, "details": details}
