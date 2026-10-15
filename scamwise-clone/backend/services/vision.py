"""Google Cloud Vision TEXT_DETECTION.

POST https://vision.googleapis.com/v1/images:annotate?key=KEY
Neutral on missing key / timeout.
"""
from __future__ import annotations

import os
from typing import Any

ENDPOINT = "https://vision.googleapis.com/v1/images:annotate"


def annotate_image(image_url: str | None = None, image_b64: str | None = None) -> dict:
    neutral: dict[str, Any] = {"text": "", "error": None, "skipped": False}
    try:
        import config  # type: ignore
        api_key = getattr(config, "VISION_KEY", "") or os.getenv("VISION_KEY", "")
        timeout = float(getattr(config, "REQUEST_TIMEOUT", 12))
    except Exception:
        api_key, timeout = os.getenv("VISION_KEY", ""), 12.0
    if not api_key or (not image_url and not image_b64):
        neutral["skipped"] = True
        if not api_key:
            neutral["error"] = "missing_key"
        return neutral
    try:
        import httpx  # type: ignore
    except Exception:
        neutral["error"] = "httpx_missing"
        return neutral
    image: dict[str, Any] = {"source": {"imageUri": image_url}} if image_url else {"content": image_b64}
    body = {"requests": [{"image": image, "features": [{"type": "TEXT_DETECTION"}]}]}
    try:
        r = httpx.post(f"{ENDPOINT}?key={api_key}", json=body, timeout=timeout)
        if r.status_code != 200:
            neutral["error"] = f"http_{r.status_code}"
            return neutral
        responses = r.json().get("responses", [{}])
        ann = (responses[0].get("textAnnotations", []) or [{}])[0]
        neutral["text"] = ann.get("description", "") or ""
        return neutral
    except Exception as e:
        neutral["error"] = type(e).__name__
        return neutral
