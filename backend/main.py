"""FastAPI server for Research Atlas.

Run from the project root (the folder that contains `backend` and `agents`):

    uvicorn backend.main:app --reload --port 8000
"""

import json
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import config  # must come before `agents` so .env is loaded first
from agents.graph import research_graph

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
logger = logging.getLogger("research-atlas")

app = FastAPI(title="Research Atlas API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.FRONTEND_ORIGINS,
    allow_origin_regex=config.FRONTEND_ORIGIN_REGEX or None,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=200, examples=["Solid-state batteries"])


@app.get("/health")
def health():
    """Quick check that the server is up and which features are configured."""
    return {
        "status": "ok",
        "model": config.GEMINI_MODEL,
        "gemini_key_set": bool(config.GOOGLE_API_KEY),
        "web_search": bool(config.TAVILY_API_KEY),
        "langsmith_tracing": config.LANGSMITH_TRACING,
        "langsmith_project": config.LANGSMITH_PROJECT if config.LANGSMITH_TRACING else None,
    }


@app.post("/research")
def research(request: ResearchRequest):
    """Run the research agents and stream progress back as newline-delimited JSON.

    Each line is one event:
        {"type": "agent", "agent": "retriever", "status": "running"}
        {"type": "agent", "agent": "retriever", "message": "..."}
        {"type": "result", "data": {...}}      <- sent once at the end
        {"type": "error", "message": "..."}    <- sent if something goes wrong
    """
    topic = request.topic.strip()
    return StreamingResponse(stream_research(topic), media_type="application/x-ndjson")


def stream_research(topic: str):
    """Run the LangGraph workflow and turn its output into NDJSON lines.

    This is a normal (sync) generator. FastAPI runs it in a worker thread, so the
    blocking Gemini and search calls don't freeze the server.
    """
    if not config.GOOGLE_API_KEY:
        yield to_line({"type": "error", "message": "GOOGLE_API_KEY is not set. Add it to backend/.env and restart the server."})
        return

    logger.info("Starting research on %r", topic)
    final_state = {}

    try:
        # stream_mode="custom" gives us the report(...) progress events from the agents.
        # stream_mode="values" gives us the full state after each step; we keep the last one.
        for mode, chunk in research_graph.stream(
            {"topic": topic},
            stream_mode=["custom", "values"],
            # These show up in LangSmith, so runs are easy to find and filter.
            config={"run_name": "research", "tags": ["research-atlas"], "metadata": {"topic": topic}},
        ):
            if mode == "custom":
                yield to_line(chunk)
            else:
                final_state = chunk

        yield to_line({
            "type": "result",
            "data": {
                "sources": final_state["sources"],
                "summaries": final_state["summaries"],
                "notes": final_state["notes"],
                "nextSteps": final_state["next_steps"],
            },
        })
        logger.info("Finished research on %r", topic)

    except Exception as error:
        logger.exception("Research on %r failed", topic)
        yield to_line({"type": "error", "message": friendly_error(error)})


def to_line(event: dict) -> str:
    return json.dumps(event, ensure_ascii=False) + "\n"


def friendly_error(error: Exception) -> str:
    """Turn common Gemini errors into messages a user can act on."""
    text = str(error)
    if "429" in text or "RESOURCE_EXHAUSTED" in text:
        return "Gemini's free-tier rate limit was reached. Wait a minute and try again."
    if "503" in text or "UNAVAILABLE" in text or "high demand" in text:
        return ("Gemini is overloaded right now and stayed busy after several retries. "
                "Try again in a few minutes, or set GEMINI_FALLBACK_MODELS in backend/.env.")
    if "API_KEY_INVALID" in text or "API key not valid" in text:
        return "The Gemini API key is not valid. Check GOOGLE_API_KEY in backend/.env."
    if "NOT_FOUND" in text and "model" in text.lower():
        return f"The model '{config.GEMINI_MODEL}' was not found. Check GEMINI_MODEL in backend/.env."
    return text or "Something went wrong while researching this topic."
