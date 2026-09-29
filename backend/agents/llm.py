import logging
import os
import random
import time
from functools import lru_cache

from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel

logger = logging.getLogger("research-atlas")

# Errors that usually go away on their own: rate limits (429) and Gemini being
# overloaded or briefly down (500 / 503 / 504, "high demand").
TRANSIENT_MARKERS = ("429", "RESOURCE_EXHAUSTED", "500", "INTERNAL", "503", "UNAVAILABLE", "504",
                     "DEADLINE_EXCEEDED", "overloaded", "high demand")

# How many times to try each model, and the first wait between tries (it doubles each time).
ATTEMPTS_PER_MODEL = int(os.getenv("GEMINI_ATTEMPTS_PER_MODEL", "4"))
FIRST_WAIT_SECONDS = float(os.getenv("GEMINI_RETRY_WAIT_SECONDS", "5"))


@lru_cache
def get_llm(model: str | None = None) -> ChatGoogleGenerativeAI:
    """A Gemini model the agents use. Created once per model name and reused."""
    return ChatGoogleGenerativeAI(
        model=model or os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        # Retries are handled in `ask_llm`, so every error type gets the same backoff.
        max_retries=0,
    )


def model_names() -> list[str]:
    """The main model first, then any fallbacks from GEMINI_FALLBACK_MODELS (comma separated)."""
    main = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    fallbacks = [name.strip() for name in os.getenv("GEMINI_FALLBACK_MODELS", "").split(",") if name.strip()]
    return [main] + [name for name in fallbacks if name != main]


def is_transient(error: Exception) -> bool:
    text = str(error)
    return any(marker in text for marker in TRANSIENT_MARKERS)


def ask_llm(prompt: str, schema: type[BaseModel]):
    """Send a prompt to Gemini and get the answer back as a Pydantic object.

    `with_structured_output` makes Gemini reply in JSON that matches `schema`,
    so the agents never have to parse free text.

    If Gemini is busy (503) or rate limited (429), wait and try again with a
    growing delay. If the main model stays busy, move on to the fallback models.
    """
    last_error: Exception | None = None

    for model in model_names():
        structured_llm = get_llm(model).with_structured_output(schema)
        wait = FIRST_WAIT_SECONDS

        for attempt in range(1, ATTEMPTS_PER_MODEL + 1):
            try:
                answer = structured_llm.invoke(prompt)
            except Exception as error:
                if not is_transient(error):
                    raise
                last_error = error
                if attempt == ATTEMPTS_PER_MODEL:
                    logger.warning("%s is still unavailable after %d tries", model, attempt)
                    break
                sleep_for = wait + random.uniform(0, wait / 2)
                logger.warning("%s is busy (try %d/%d), retrying in %.1fs",
                               model, attempt, ATTEMPTS_PER_MODEL, sleep_for)
                time.sleep(sleep_for)
                wait *= 2
                continue

            if answer is None:
                raise RuntimeError("Gemini returned an empty or unreadable answer. Please try again.")
            return answer

    raise last_error
