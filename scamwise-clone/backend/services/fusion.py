"""Weighted fusion with veto rules -> final 0-100 + LOW/MED/HIGH/CRITICAL + reasons[]."""
from __future__ import annotations

from typing import Any

WEIGHTS = {
    "local": 0.30,
    "gemini": 0.20,
    "openai": 0.15,
    "virustotal": 0.15,
    "ipqs": 0.10,
    "search": 0.10,
}


def _band(score: int) -> str:
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 35:
        return "MED"
    return "LOW"


def _vt_score(vt: dict | None) -> tuple[float, str | None]:
    if not vt or vt.get("skipped") or vt.get("error"):
        return 50.0, None
    positives = int(vt.get("positives", 0) or 0)
    total = int(vt.get("total", 0) or 0)
    if positives >= 5:
        return 95.0, f"VirusTotal {positives}/{total} engines flag malicious"
    if positives >= 2:
        return 80.0, f"VirusTotal {positives}/{total} engines flag malicious"
    if positives == 1:
        return 65.0, "VirusTotal 1 engine flag"
    if total > 0:
        return 15.0, "VirusTotal clean (0 detections)"
    return 50.0, None


def _ipqs_score(ipqs: dict | None) -> tuple[float, str | None]:
    if not ipqs or ipqs.get("skipped") or ipqs.get("error"):
        return 50.0, None
    if ipqs.get("phishing") or ipqs.get("malware"):
        return 90.0, "IPQS flags phishing/malware"
    rs = int(ipqs.get("risk_score", 0) or 0)  # 0-100
    if rs >= 75:
        return 85.0, f"IPQS high risk_score={rs}"
    if rs >= 40:
        return 65.0, f"IPQS elevated risk_score={rs}"
    return 15.0, "IPQS low risk"


def fuse(
    local: dict | None = None,
    safebrowsing: dict | None = None,
    virustotal: dict | None = None,
    ipqs: dict | None = None,
    gemini: dict | None = None,
    openai: dict | None = None,
    search: dict | None = None,
) -> dict:
    reasons: list[str] = []
    local_score = float((local or {}).get("score", 50))
    reasons.extend((local or {}).get("reasons", []) or [])

    def _llm(name: str, d: dict | None) -> float:
        if not d or d.get("skipped") or d.get("error"):
            return 50.0
        try:
            reasons.append(f"{name} phishProb={int(d.get('phishProb', 50))}")
        except Exception:
            pass
        for t in (d.get("tactics", []) or [])[:5]:
            reasons.append(f"{name} tactic: {t}")
        return float(d.get("phishProb", 50))

    gem_score = _llm("Gemini", gemini)
    oai_score = _llm("OpenAI", openai)
    vt_score, vt_reason = _vt_score(virustotal)
    if vt_reason:
        reasons.append(vt_reason)
    ipqs_score, ipqs_reason = _ipqs_score(ipqs)
    if ipqs_reason:
        reasons.append(ipqs_reason)

    if search and not search.get("skipped", False):
        hits = int(search.get("flag_hits", 0) or 0)
        n = len(search.get("results", []) or [])
        if hits >= 2:
            search_score = 80.0
            reasons.append(f"web-reputation: {hits}/{n} results mention scam/phish")
        elif hits == 1:
            search_score = 65.0
            reasons.append("web-reputation: 1 result mentions scam/phish")
        elif n > 0:
            search_score = 30.0
            reasons.append("web-reputation: no scam mentions found")
        else:
            search_score = 50.0
    else:
        search_score = 50.0

    parts = {
        "local": local_score, "gemini": gem_score, "openai": oai_score,
        "virustotal": vt_score, "ipqs": ipqs_score, "search": search_score,
    }
    # renormalize weights for signals actually present (non-neutral providers count less)
    active = dict(WEIGHTS)
    for k in ("gemini", "openai", "virustotal", "ipqs", "search"):
        src = {"gemini": gemini, "openai": openai, "virustotal": virustotal, "ipqs": ipqs, "search": search}[k]
        if not src or src.get("skipped") or src.get("error"):
            active[k] *= 0.25  # down-weight missing signals instead of dropping
    total_w = sum(active.values())
    final = sum(parts[k] * w for k, w in active.items()) / total_w

    # ---- veto / floor rules ----
    sb_match = bool((safebrowsing or {}).get("match"))
    if sb_match:
        threats = (safebrowsing or {}).get("threats", []) or []
        label = threats[0].get("threatType", "UNSAFE") if threats else "UNSAFE"
        reasons.insert(0, f"SafeBrowsing MATCH ({label}) - floor HIGH")
        final = max(final, 75.0)  # floor HIGH
    if (virustotal or {}).get("positives", 0) >= 5:
        final = max(final, 85.0)
        reasons.insert(0, "Veto: 5+ VT engines -> floor CRITICAL")
    if (ipqs or {}).get("phishing") or (ipqs or {}).get("malware"):
        final = max(final, 75.0)
        reasons.insert(0, "Veto: IPQS phishing/malware -> floor HIGH")

    score = int(round(max(0, min(100, final))))
    band = _band(score)
    return {
        "score": score,
        "band": band,
        "level": band,  # alias
        "reasons": reasons[:20],
        "breakdown": {k: round(float(v), 1) for k, v in parts.items()},
    }
