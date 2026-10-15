"""ScamWise FastAPI backend: POST /analyze {url, text}, GET /health. CORS open."""
from __future__ import annotations

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from fastapi import FastAPI  # type: ignore
    from fastapi.middleware.cors import CORSMiddleware  # type: ignore
    from pydantic import BaseModel  # type: ignore
    _HAS_FASTAPI = True
except Exception:  # import-clean even without deps installed
    FastAPI = object  # type: ignore
    CORSMiddleware = object  # type: ignore

    class BaseModel:  # type: ignore
        pass

    _HAS_FASTAPI = False

from services.local_rules import analyze_local
from services.safebrowsing import check_safebrowsing
from services.virustotal import check_virustotal
from services.ipqs import check_ipqs
from services.gemini import analyze_gemini
from services.openai import analyze_openai
from services.search import search_reputation
from services.fusion import fuse

if _HAS_FASTAPI:
    class AnalyzeRequest(BaseModel):
        url: str = ""
        text: str = ""

    app = FastAPI(title="ScamWise API", version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict:
        return {"ok": True, "service": "scamwise-backend"}

    @app.post("/analyze")
    def analyze(req: AnalyzeRequest) -> dict:
        url = (req.url or "").strip()
        text = (req.text or "").strip()
        local = analyze_local(url, text)
        sb = check_safebrowsing(url) if url else {"match": False, "threats": [], "skipped": True}
        vt = check_virustotal(url) if url else {"positives": 0, "total": 0, "skipped": True}
        ipqs = check_ipqs(url) if url else {"skipped": True}
        gem = analyze_gemini(url, text)
        oai = analyze_openai(url, text)
        rep = search_reputation(url) if url else {"results": [], "flag_hits": 0, "skipped": True}
        verdict = fuse(local, sb, vt, ipqs, gem, oai, rep)
        return {
            "verdict": verdict,
            "signals": {
                "local": local, "safebrowsing": sb, "virustotal": vt,
                "ipqs": ipqs, "gemini": gem, "openai": oai, "search": rep,
            },
        }
else:  # placeholder so `import app` never crashes without fastapi
    app = None  # type: ignore
