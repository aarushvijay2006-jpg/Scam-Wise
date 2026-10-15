"""Web-reputation search: Tavily + Serper. Neutral on missing key/timeout."""
from __future__ import annotations

import os
from typing import Any


def _keys() -> tuple[str, str, float]:
    try:
        import config  # type: ignore
        return (
            getattr(config, "TAVILY_KEY", "") or os.getenv("TAVILY_KEY", ""),
            getattr(config, "SERPER_KEY", "") or os.getenv("SERPER_KEY", ""),
            float(getattr(config, "REQUEST_TIMEOUT", 12)),
        )
    except Exception:
        return os.getenv("TAVILY_KEY", ""), os.getenv("SERPER_KEY", ""), 12.0


def search_tavily(query: str, max_results: int = 5) -> dict:
    out: dict[str, Any] = {"results": [], "error": None, "skipped": False}
    tavily_key, _, timeout = _keys()
    if not tavily_key or not (query or "").strip():
        out.update(skipped=True, error=None if query else "empty_query")
        if not tavily_key:
            out["error"] = "missing_key"
        return out
    try:
        import httpx  # type: ignore
    except Exception:
        out["error"] = "httpx_missing"
        return out
    try:
        r = httpx.post(
            "https://api.tavily.com/search",
            headers={"Authorization": f"Bearer {tavily_key}"},
            json={"query": query[:400], "max_results": max_results, "include_answer": False},
            timeout=timeout,
        )
        if r.status_code != 200:
            out["error"] = f"http_{r.status_code}"
            return out
        data = r.json()
        for item in (data.get("results", []) or [])[:max_results]:
            out["results"].append({
                "title": item.get("title", ""), "url": item.get("url", ""),
                "snippet": (item.get("content", "") or "")[:400],
            })
        return out
    except Exception as e:
        out["error"] = type(e).__name__
        return out


def search_serper(query: str, num: int = 5) -> dict:
    out: dict[str, Any] = {"results": [], "error": None, "skipped": False}
    _, serper_key, timeout = _keys()
    if not serper_key or not (query or "").strip():
        out.update(skipped=True, error=None if query else "empty_query")
        if not serper_key:
            out["error"] = "missing_key"
        return out
    try:
        import httpx  # type: ignore
    except Exception:
        out["error"] = "httpx_missing"
        return out
    try:
        r = httpx.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": serper_key, "Content-Type": "application/json"},
            json={"q": query[:400], "num": num},
            timeout=timeout,
        )
        if r.status_code != 200:
            out["error"] = f"http_{r.status_code}"
            return out
        for item in (r.json().get("organic", []) or [])[:num]:
            out["results"].append({
                "title": item.get("title", ""), "url": item.get("link", ""),
                "snippet": (item.get("snippet", "") or "")[:400],
            })
        return out
    except Exception as e:
        out["error"] = type(e).__name__
        return out


def search_reputation(url: str) -> dict:
    """Combine both providers for a '<url> scam OR phishing review' query."""
    q = f'"{(url or "")[:200]}" scam OR phishing review'
    tav = search_tavily(q)
    ser = search_serper(q)
    results = (tav.get("results", []) or []) + (ser.get("results", []) or [])
    flag_words = ("scam", "phish", "fraud", "fake", "malicious", "complaint", "beware")
    hits = sum(1 for r in results if any(w in f"{r.get('title','')} {r.get('snippet','')}".lower() for w in flag_words))
    return {"results": results[:10], "flag_hits": hits, "tavily": tav, "serper": ser}
