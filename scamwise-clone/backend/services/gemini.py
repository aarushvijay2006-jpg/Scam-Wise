"""Gemini phishing analysis via REST. Returns {phishProb, tactics, explanation}."""
from __future__ import annotations

import json
import os
import re
from typing import Any

MODEL = "gemini-1.5-flash"


def _neutral(reason: str = "missing_key") -> dict:
    return {"phishProb": 50, "tactics": [], "explanation": "", "error": reason, "skipped": True}


def analyze_gemini(url: str = "", text: str = "") -> dict:
    try:
        import config  # type: ignore
        api_key = getattr(config, "GEMINI_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
        timeout = float(getattr(config, "REQUEST_TIMEOUT", 12))
    except Exception:
        api_key, timeout = os.getenv("GEMINI_API_KEY", ""), 12.0
    if not api_key:
        return _neutral("missing_key")
    try:
        import httpx  # type: ignore
    except Exception:
        return _neutral("httpx_missing")
    prompt = (
        "You are a phishing analyst. Given a URL and page/message text, estimate the "
        "probability it is a phish/scam (0-100) and list social-engineering tactics. "
        'Reply ONLY as JSON: {"phishProb": <int>, "tactics": [<strings>], "explanation": "<short>"}\n'
        f"URL: {url[:500]}\nTEXT: {text[:2000]}"
    )
    body = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        r = httpx.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={api_key}",
            json=body, timeout=timeout,
        )
        if r.status_code != 200:
            d = _neutral(f"http_{r.status_code}")
            return d
        data = r.json()
        try:
            raw = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            return _neutral("bad_response")
        m = re.search(r"\{.*\}", raw, re.S)
        parsed = json.loads(m.group(0) if m else raw)
        return {
            "phishProb": max(0, min(100, int(parsed.get("phishProb", 50)))),
            "tactics": list(parsed.get("tactics", []))[:10],
            "explanation": str(parsed.get("explanation", ""))[:1000],
            "error": None, "skipped": False,
        }
    except Exception as e:
        d: dict[str, Any] = _neutral(type(e).__name__)
        return d
