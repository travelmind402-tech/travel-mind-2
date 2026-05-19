import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from google import genai


def _load_env_once() -> None:
    """Best-effort env loader.

    Some scripts/tests may import this module without going through
    backend/main.py (which also calls load_dotenv). To make model calls
    more robust, we load backend/.env here if present.
    """

    backend_dir = Path(__file__).resolve().parent.parent
    env_path = backend_dir / ".env"
    if env_path.exists():
        load_dotenv(env_path)


@lru_cache(maxsize=1)
def get_genai_client() -> genai.Client:
    _load_env_once()

    api_key = os.getenv("GOOGLE_GENERATIVE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_GENERATIVE_API_KEY is not set")

    return genai.Client(api_key=api_key)

