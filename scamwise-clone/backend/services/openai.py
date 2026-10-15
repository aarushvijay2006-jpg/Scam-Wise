"""OpenAI phishing analysis via Chat Completions REST (httpx, no SDK needed).

Returns {phishProb, tactics, explanation}. Neutral on missing key/timeout.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any


def _neutral(reason: str = "missing_key") -> dict:
    return {"phishProb": 50, "tactics": [], "explanation": "", "error": reason, "skipped": True}


def analyze_openai(url: str = "", text: str = "") -> dict:
    try:
        import config  # type: ignore
        api_key = getattr(config, "OPENAI_API_KEY", "") or os.getenv("OPENAI_API_KEY", "")
        timeout = float(getattr(config, "REQUEST_TIMEOUT", 12))
    except Exception:
        api_key, timeout = os.getenv("OPENAI_API_KEY", ""), 12.0
    if not api_key:
        return _neutral("missing_key")
    try:
        import httpx  # type: ignore
    except Exception:
        return _neutral("httpx_missing")
    body = {
        "model": "gpt-4o-mini",
        "messages": [{
            "role": "user",
            "content": (
                "You are a phishing analyst. Estimate probability (0-100) the given URL/text "
                "is a phish/scam and list tactics. Reply ONLY as JSON: "
                '{"phishProb": <int>, "tactics": [], "explanation": "<short>"}\n'
                f"URL: {url[:500]}\nTEXT: {text[:2000]}"
            ),
        }],
        "temperature": 0,
    }
    try:
        r = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json=body, timeout=timeout,
        )
        if r.status_code != 200:
            return _neutral(f"http_{r.status_code}")
        content = r.json()["choices"][0]["message"]["content"]
        m = re.search(r"\{.*\}", content, re.S)
        parsed = json.loads(m.group(0) if m else content)
        return {
            "phishProb": max(0, min(100, int(parsed.get("phishProb", 50)))),
            "tactics": list(parsed.get("tactics", []))[:10],
            "explanation": str(parsed.get("explanation", ""))[:1000],
            "error": None, "skipped": False,
        }
    except Exception as e:
        d: dict[str, Any] = _neutral(type(e).__name__)
        return d
