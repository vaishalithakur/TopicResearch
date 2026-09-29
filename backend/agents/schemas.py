"""The shapes of the answers we ask Gemini for (structured output)."""

from typing import Literal

from pydantic import BaseModel, Field


# ---------- Per-source summary ----------

class SourceSummary(BaseModel):
    source_id: str = Field(description="The id of the source, e.g. 's3'")
    relevance: float = Field(description="How relevant this source is to the topic, from 0.0 to 1.0")
    tldr: str = Field(description="One sentence: what this source tells us and why it matters")
    key_points: list[str] = Field(description="2-3 short key points from the source")


class Theme(BaseModel):
    title: str = Field(description="Short theme name, 2-5 words")
    description: str = Field(description="One sentence explaining the theme")
    source_ids: list[str] = Field(description="Ids of the sources that support this theme")


class NoteSection(BaseModel):
    heading: str
    body: str = Field(description="Plain text or '- ' bullet lines. Cite sources like [s1, s3].")


class Task(BaseModel):
    text: str = Field(description="A concrete next action for the researcher")
    priority: Literal["high", "medium", "low"]
    source_id: str | None = Field(default=None, description="Id of the related source, if any")


# ---------- Everything the Analyst returns, in one request ----------

class ResearchReport(BaseModel):
    summaries: list[SourceSummary] = Field(description="One summary for every source")
    overview: str = Field(description="A 3-4 sentence overview of what the sources say together")
    themes: list[Theme] = Field(description="3 main themes across the sources")
    consensus: list[str] = Field(description="2-3 points most sources agree on")
    debates: list[str] = Field(description="1-3 points where sources disagree or evidence is unclear")
    notes: list[NoteSection] = Field(
        description="Draft notes with these sections: Research question, Background, "
        "Key findings, Tensions and debates, Working thesis"
    )
    tasks: list[Task] = Field(description="4-6 next steps, most important first")
    open_questions: list[str] = Field(description="3 questions the sources leave unanswered")
    follow_up_topics: list[str] = Field(description="4 related topics worth researching next, 2-6 words each")
