from typing import TypedDict


class ResearchState(TypedDict, total=False):
    """Everything the agents share while researching one topic.

    Each agent reads what earlier agents wrote and adds its own part.
    The dicts inside `sources`, `summaries`, `notes` and `next_steps` already use
    the field names the React frontend expects, so the API can send them as-is.
    """

    topic: str

    # Source Retriever (then filtered and ranked by the Analyst)
    sources: list[dict]

    # Analyst
    summaries: dict
    notes: list[dict]
    next_steps: dict
