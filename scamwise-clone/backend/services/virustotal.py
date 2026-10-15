"""VirusTotal v3 URL report. GET /urls/{b64url} with x-apikey header."""
from __future__ import annotations

import base64
import os
from typing import Any


def _key() -> str:
    try:
        import config  # type: ignore
        return getattr(config, "VT_KEY", "") or os.getenv("VT_KEY", "")
    except Exception:
        return os.getenv("VT_KEY", "")


def url_id(url: str) -> str:
    return base64.urlsafe_b64encode(url.encode()).decode().strip("=")


def check_virustotal(url: str) -> dict:
    neutral: dict[str, Any] = {
        "malicious": 0, "suspicious": 0, "harmless": 0,
        "reputation": 0, "positives": 0, "total": 0,
        "error": None, "skipped": False,
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
            f"https://www.virustotal.com/api/v3/urls/{url_id(url)}",
            headers={"x-apikey": api_key},
            timeout=timeout,
        )
        if r.status_code != 200:
            neutral["error"] = f"http_{r.status_code}"
            return neutral
        attrs = (r.json().get("data", {}).get("attributes", {})) or {}
        stats = attrs.get("last_analysis_stats", {}) or {}
        neutral.update({
            "malicious": int(stats.get("malicious", 0)),
            "suspicious": int(stats.get("suspicious", 0)),
            "harmless": int(stats.get("harmless", 0)),
            "reputation": int(attrs.get("reputation", 0) or 0),
            "positives": int(stats.get("malicious", 0)) + int(stats.get("suspicious", 0)),
            "total": sum(int(v) for v in stats.values() if isinstance(v, int)),
        })
        return neutral
    except Exception as e:
        neutral["error"] = type(e).__name__
        return neutral
