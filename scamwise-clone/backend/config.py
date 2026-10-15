"""Central config: load API keys from environment (.env supported)."""
import os

try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    # dotenv is optional at import time; env vars still work.
    pass


def _get(name: str, default: str = "") -> str:
    return os.getenv(name, default) or default


GEMINI_API_KEY: str = _get("GEMINI_API_KEY")
OPENAI_API_KEY: str = _get("OPENAI_API_KEY")
SAFEBROWSING_KEY: str = _get("SAFEBROWSING_KEY")
VT_KEY: str = _get("VT_KEY")
IPQS_KEY: str = _get("IPQS_KEY")
VISION_KEY: str = _get("VISION_KEY")
TAVILY_KEY: str = _get("TAVILY_KEY")
SERPER_KEY: str = _get("SERPER_KEY")

REQUEST_TIMEOUT: float = float(os.getenv("REQUEST_TIMEOUT", "12"))
