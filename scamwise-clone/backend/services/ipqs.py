"""IPQualityScore URL reputation. GET https://www.ipqualityscore.com/api/json/url/KEY/{url}."""
from __future__ import annotations

import os
from typing import Any
from urllib.parse import quote


def _key() -> str:
    try:
        import config  # type: ignore
        return getattr(config, "IPQS_KEY", "") or os.getenv("IPQS_KEY", "")
    except Exception:
        return os.getenv("IPQS_KEY", "")


def check_ipqs(url: str) -> dict:
    neutral: dict[str, Any] = {
        "phishing": False, "malware": False, "suspicious": False,
        "risk_score": 0, "domain_age": None, "error": None, "skipped": False,
    }
    api_key = _key()
    if not api_key or not (url or "").strip():
        neutral["skipped"] = True
        if not api_key:
            neutral["error"] = "missing_key"
        return neutral
    try:
        import httpx  # type: ignore
    except Exception:
        neutral["error"] = "httpx_missing"
        return neutral
    try:
        import config  # type: ignore
        timeout = float(getattr(config, "REQUEST_TIMEOUT", 12))
    except Exception:
        timeout = 12.0
    try:
        r = httpx.get(
            f"https://www.ipqualityscore.com/api/json/url/{api_key}/{quote(url, safe='')}",
            timeout=timeout,
        )
        if r.status_code != 200:
            neutral["error"] = f"http_{r.status_code}"
            return neutral
        d = r.json()
        neutral.update({
            "phishing": bool(d.get("phishing")),
            "malware": bool(d.get("malware")),
            "suspicious": bool(d.get("suspicious")),
            "risk_score": int(d.get("risk_score", 0) or 0),
            "domain_age": d.get("domain_age"),
        })
        return neutral
    except Exception as e:
        neutral["error"] = type(e).__name__
        return neutral
