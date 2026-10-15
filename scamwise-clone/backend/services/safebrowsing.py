"""Google Safe Browsing v4 threatMatches:find lookup.

Live endpoint (verified):
  POST https://safebrowsing.googleapis.com/v4/threatMatches:find?key=KEY
Neutral ({match: False}) on missing key / timeout / error.
"""
from __future__ import annotations

import os
from typing import Any

ENDPOINT = "https://safebrowsing.googleapis.com/v4/threatMatches:find"


def _key() -> str:
    try:
        import config  # type: ignore
        return getattr(config, "SAFEBROWSING_KEY", "") or os.getenv("SAFEBROWSING_KEY", "")
    except Exception:
        return os.getenv("SAFEBROWSING_KEY", "")


def _timeout() -> float:
    try:
        import config  # type: ignore
        return float(getattr(config, "REQUEST_TIMEOUT", 12))
    except Exception:
        return 12.0


def check_safebrowsing(url: str) -> dict:
    neutral: dict[str, Any] = {"match": False, "threats": [], "error": None, "skipped": False}
    api_key = _key()
    if not api_key or not (url or "").strip():
        neutral["skipped"] = True
        if not api_key:
            neutral["error"] = "missing_key"
        return neutral
    body = {
        "client": {"clientId": "scamwise-clone", "clientVersion": "1.0"},
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}],
        },
    }
    try:
        import httpx  # type: ignore
    except Exception:
        neutral["error"] = "httpx_missing"
        return neutral
    try:
        r = httpx.post(f"{ENDPOINT}?key={api_key}", json=body, timeout=_timeout())
        if r.status_code != 200:
            neutral["error"] = f"http_{r.status_code}"
            return neutral
        data = r.json()
        matches = data.get("matches", []) or []
        neutral["match"] = bool(matches)
        neutral["threats"] = [
            {"threatType": m.get("threatType"), "platformType": m.get("platformType")}
            for m in matches
        ]
        return neutral
    except Exception as e:  # timeout / network -> neutral
        neutral["error"] = type(e).__name__
        return neutral
