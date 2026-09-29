"""Search tools used by the Source Retriever.

- arXiv and Wikipedia are free and need no API key.
- Web search uses Tavily, which is optional: set TAVILY_API_KEY to turn it on
  (the free plan is enough).

Every result is a dict with the same fields, so the retriever can mix them.
`@traceable` makes each search show up as its own step in LangSmith.
"""

import os
import re
import xml.etree.ElementTree as ET
from urllib.parse import quote, urlparse

import httpx
from langsmith import traceable

# Wikipedia blocks requests without a descriptive User-Agent that includes a URL.
HEADERS = {"User-Agent": "ResearchAtlas/0.1 (https://github.com/; student research assistant)"}
TIMEOUT = 20

# Rough reading time by kind of source, shown in the UI.
READING_MINUTES = {"paper": 25, "report": 20, "video": 15, "article": 8}

HIGH_CREDIBILITY_DOMAINS = (
    "arxiv.org", "nature.com", "science.org", "nih.gov", "who.int", "ieee.org",
    "acm.org", "springer.com", "sciencedirect.com", "wiley.com", "pnas.org",
)
LOW_CREDIBILITY_DOMAINS = ("reddit.com", "quora.com", "medium.com", "youtube.com", "tiktok.com")


# ---------- arXiv (research papers) ----------

@traceable(run_type="retriever", name="search_arxiv")
def search_arxiv(query: str, max_results: int = 4) -> list[dict]:
    # First require every word to match ("all:solid-state AND all:batteries"), which
    # gives much more on-topic papers. If that finds nothing, fall back to any word.
    words = [w for w in re.findall(r"[\w-]+", query) if len(w) > 2]
    strict_query = " AND ".join(f"all:{word}" for word in words)

    results = fetch_arxiv(strict_query, max_results) if strict_query else []
    if not results:
        results = fetch_arxiv(f"all:{query}", max_results)
    return results


def fetch_arxiv(search_query: str, max_results: int) -> list[dict]:
    response = httpx.get(
        "https://export.arxiv.org/api/query",
        params={"search_query": search_query, "max_results": max_results, "sortBy": "relevance"},
        headers=HEADERS,
        timeout=TIMEOUT,
        follow_redirects=True,
    )
    response.raise_for_status()

    # arXiv answers in Atom XML, not JSON.
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    root = ET.fromstring(response.text)

    results = []
    for entry in root.findall("atom:entry", ns):
        published = entry.findtext("atom:published", "", ns)
        results.append(make_source(
            title=entry.findtext("atom:title", "", ns),
            url=entry.findtext("atom:id", "", ns),
            snippet=entry.findtext("atom:summary", "", ns),
            publisher="arXiv",
            year=int(published[:4]) if published else None,
            source_type="paper",
        ))
    return results


# ---------- Wikipedia (background and definitions) ----------

@traceable(run_type="retriever", name="search_wikipedia")
def search_wikipedia(query: str, max_results: int = 2) -> list[dict]:
    response = httpx.get(
        "https://en.wikipedia.org/w/api.php",
        params={
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srlimit": max_results,
            "srprop": "snippet|timestamp",
            "format": "json",
        },
        headers=HEADERS,
        timeout=TIMEOUT,
    )
    response.raise_for_status()

    results = []
    for page in response.json()["query"]["search"]:
        title = page["title"]
        results.append(make_source(
            title=title,
            url=f"https://en.wikipedia.org/wiki/{quote(title.replace(' ', '_'))}",
            snippet=page["snippet"],  # contains <span> tags; make_source strips them
            publisher="Wikipedia",
            year=int(page["timestamp"][:4]),
            source_type="article",
        ))
    return results


# ---------- Tavily (general web: news, reports, blogs) ----------

@traceable(run_type="retriever", name="search_web")
def search_web(query: str, max_results: int = 3) -> list[dict]:
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return []

    response = httpx.post(
        "https://api.tavily.com/search",
        json={"query": query, "max_results": max_results, "search_depth": "basic"},
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=TIMEOUT,
    )
    response.raise_for_status()

    results = []
    for item in response.json().get("results", []):
        url = item["url"]
        published = item.get("published_date") or ""
        year = re.search(r"\b(19|20)\d{2}\b", published)
        results.append(make_source(
            title=item.get("title") or url,
            url=url,
            snippet=item.get("content", ""),
            publisher=domain_of(url),
            year=int(year.group()) if year else None,
            source_type=guess_type(url),
        ))
    return results


# ---------- Helpers ----------

def make_source(title, url, snippet, publisher, year, source_type) -> dict:
    """Build one source in the format the frontend expects."""
    return {
        "title": clean_text(title),
        "url": url,
        "snippet": shorten(clean_text(snippet)),
        "publisher": publisher,
        "year": year,
        "type": source_type,
        "credibility": guess_credibility(url),
        "readingMinutes": READING_MINUTES[source_type],
    }


def clean_text(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text or "")  # remove HTML tags
    return re.sub(r"\s+", " ", text).strip()   # collapse whitespace and newlines


def shorten(text: str, limit: int = 600) -> str:
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0] + "…"


def domain_of(url: str) -> str:
    return urlparse(url).netloc.removeprefix("www.")


def guess_type(url: str) -> str:
    domain = domain_of(url)
    if "youtube.com" in domain or "youtu.be" in domain or "vimeo.com" in domain:
        return "video"
    if url.lower().endswith(".pdf"):
        return "report"
    return "article"


def guess_credibility(url: str) -> str:
    """A simple rule of thumb based on the website. Not a real fact-check."""
    domain = domain_of(url)
    if domain.endswith((".gov", ".edu")) or ".ac." in domain or domain.endswith(HIGH_CREDIBILITY_DOMAINS):
        return "high"
    if domain.endswith(LOW_CREDIBILITY_DOMAINS):
        return "low"
    return "medium"
