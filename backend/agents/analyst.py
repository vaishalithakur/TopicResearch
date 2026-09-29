from agents.llm import ask_llm
from agents.progress import report
from agents.schemas import ResearchReport
from agents.state import ResearchState

MAX_SOURCES = 8        # how many sources end up in the dashboard
MIN_RELEVANCE = 0.3    # sources scored below this are dropped

PROMPT = """You are a research assistant helping a student research: {topic}

Below are the sources that were found. Do all of the following in ONE answer.

1. Summaries: for EVERY source give
   - relevance: 0.0 (off-topic) to 1.0 (directly about the topic)
   - tldr: one sentence on what it tells us
   - key_points: 2-3 short points
2. Synthesis, using only sources with relevance >= {min_relevance}:
   - an overview of what the sources say together (3-4 sentences)
   - 3 themes, each citing the source ids that support it
   - where the sources agree (consensus) and where they disagree or the evidence is unclear (debates)
3. Draft notes the student can build on. Use these sections in order: Research question,
   Background, Key findings, Tensions and debates, Working thesis. Keep each section short.
   Cite sources inline like [s1] or [s2, s4].
4. 4-6 concrete next steps with a priority. Link a step to a source id when it is about one source.
5. 3 open questions the sources leave unanswered, and 4 related follow-up topics to research next.

Only use the text given for each source and only cite the ids listed. Do not invent facts.

Sources:
{sources}
"""


def analyst(state: ResearchState) -> dict:
    """Agent 2: summarize, synthesize and advise in a single Gemini request.

    Doing everything in one request (instead of one per step) keeps the number of
    LLM calls per research run at exactly one, which matters when Gemini is busy.
    """
    topic = state["topic"]
    sources = state["sources"]
    report("analyst", status="running", message=f"Reading {len(sources)} sources")

    result = ask_llm(
        PROMPT.format(topic=topic, min_relevance=MIN_RELEVANCE, sources=format_sources(sources)),
        ResearchReport,
    )

    # Attach each summary to its source, drop off-topic sources, keep the most relevant.
    # Ids are kept as they are, so the citations Gemini wrote in the notes stay correct.
    summary_by_id = {s.source_id: s for s in result.summaries}
    ranked = [
        (source, summary_by_id[source["id"]])
        for source in sources
        if source["id"] in summary_by_id and summary_by_id[source["id"]].relevance >= MIN_RELEVANCE
    ]
    ranked.sort(key=lambda pair: pair[1].relevance, reverse=True)
    ranked = ranked[:MAX_SOURCES]

    if not ranked:
        raise RuntimeError("None of the sources found were relevant enough. Try rewording the topic.")

    kept_sources = [
        {**source, "relevance": round(min(summary.relevance, 1.0), 2)} for source, summary in ranked
    ]
    per_source = [
        {"sourceId": source["id"], "tldr": summary.tldr, "keyPoints": summary.key_points}
        for source, summary in ranked
    ]
    report("analyst", message=f"Kept the {len(kept_sources)} most relevant sources")

    # Gemini could cite an id that doesn't exist (or was dropped), so keep only real ones.
    valid_ids = {s["id"] for s in kept_sources}
    themes = [
        {
            "title": theme.title,
            "description": theme.description,
            "sourceIds": [i for i in theme.source_ids if i in valid_ids],
        }
        for theme in result.themes
    ]
    notes = [
        {"id": f"n{number}", "heading": section.heading, "body": section.body}
        for number, section in enumerate(result.notes, start=1)
    ]
    tasks = [
        {
            "id": f"t{number}",
            "text": task.text,
            "priority": task.priority,
            "done": False,
            "sourceId": task.source_id if task.source_id in valid_ids else None,
        }
        for number, task in enumerate(result.tasks, start=1)
    ]

    report("analyst", message=f"Found {len(themes)} themes, {len(result.debates)} open debates")
    report("analyst", message=f"Wrote {len(notes)} note sections and {len(tasks)} next steps")
    report("analyst", status="done")

    return {
        "sources": kept_sources,
        "summaries": {
            "perSource": per_source,
            "overview": result.overview,
            "themes": themes,
            "consensus": result.consensus,
            "debates": result.debates,
        },
        "notes": notes,
        "next_steps": {
            "tasks": tasks,
            "questions": result.open_questions,
            "followUps": result.follow_up_topics,
        },
    }


def format_sources(sources: list[dict]) -> str:
    lines = []
    for s in sources:
        lines.append(f"[{s['id']}] {s['title']} ({s['publisher']}, {s['year'] or 'n.d.'})\n{s['snippet']}")
    return "\n\n".join(lines)
