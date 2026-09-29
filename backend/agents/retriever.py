import logging
import os

from agents.progress import report
from agents.search_tools import search_arxiv, search_web, search_wikipedia
from agents.state import ResearchState

logger = logging.getLogger(__name__)


def retriever(state: ResearchState) -> dict:
    """Agent 1: collect candidate sources from arXiv, Wikipedia and the web.

    This agent does not call the LLM. It only searches, then removes duplicates.
    """
    topic = state["topic"]
    # Built from the topic directly, so no LLM call is needed to plan the searches.
    queries = [topic, f"{topic} research review", f"{topic} challenges and open problems"]
    report("retriever", status="running")

    found = []
    found += run_search("arXiv", search_arxiv, topic)
    found += run_search("Wikipedia", search_wikipedia, topic)

    if os.getenv("TAVILY_API_KEY"):
        for query in queries:
            found += run_search(f"the web for “{query}”", search_web, query)
    else:
        report("retriever", message="Web search is off (no TAVILY_API_KEY), using arXiv and Wikipedia")

    # The same page can come back from different queries, so keep only the first copy.
    sources = []
    seen_urls = set()
    for source in found:
        if source["url"] and source["url"] not in seen_urls:
            seen_urls.add(source["url"])
            sources.append(source)

    if not sources:
        raise RuntimeError("No sources were found for this topic. Try a broader or differently worded topic.")

    # Give each source a short id the other agents can cite, like [s1].
    for number, source in enumerate(sources, start=1):
        source["id"] = f"s{number}"

    report("retriever", message=f"Collected {len(sources)} unique sources")
    report("retriever", status="done")
    return {"sources": sources}


def run_search(label: str, search_function, query: str) -> list[dict]:
    """Run one search. If it fails, log it and carry on with the other searches."""
    report("retriever", message=f"Searching {label}…")
    try:
        return search_function(query)
    except Exception as error:
        logger.warning("Search on %s failed: %s", label, error)
        report("retriever", message=f"Could not search {label}, skipping")
        return []
