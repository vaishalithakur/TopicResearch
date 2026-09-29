"""Loads settings from backend/.env.

Import this module before anything from `agents`, so the API keys are in the
environment by the time Gemini and LangSmith are set up.

LangSmith needs no code: when LANGSMITH_TRACING=true and LANGSMITH_API_KEY are set,
LangGraph and LangChain send every run to LangSmith automatically.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")

LANGSMITH_TRACING = os.getenv("LANGSMITH_TRACING", "false").lower() == "true"
LANGSMITH_PROJECT = os.getenv("LANGSMITH_PROJECT", "default")

# Where the React app runs. Vite uses 5173 for `npm run dev` and 4173 for `npm run preview`.
FRONTEND_ORIGINS = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://localhost:4173").split(",")
]

# Vite silently moves to the next free port (5174, 5175, ...) when 5173 is taken,
# so also allow any port on localhost / 127.0.0.1 during local development.
FRONTEND_ORIGIN_REGEX = os.getenv("FRONTEND_ORIGIN_REGEX", r"http://(localhost|127\.0\.0\.1)(:\d+)?")
