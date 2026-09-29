from agents.llm import ask_llm
from agents.progress import report
from agents.schemas import AdvisorPlan
from agents.state import ResearchState
from agents.synthesizer import format_summaries

PROMPT = """You are a research advisor. A student is researching: {topic}

Their original sub-questions:
{sub_questions}

What the sources say overall:
{overview}

Consensus: {consensus}
Debates: {debates}

Source summaries:
{summaries}

Write:
1. Draft notes the student can build on. Use these sections in order: Research question,
   Background, Key findings, Tensions and debates, Working thesis. Keep each section short.
   Cite sources inline like [s1] or [s2, s4].
2. 4-6 concrete next steps with a priority. Link a step to a source id when it is about one source.
3. 3 open questions the sources leave unanswered.
4. 4 related follow-up topics to research next.
"""


def advisor(state: ResearchState) -> dict:
    """Agent 5: write draft notes and recommend what to do next."""
    report("advisor", status="running", message="Drafting structured notes")

    summaries = state["summaries"]
    prompt = PROMPT.format(
        topic=state["topic"],
        sub_questions="\n".join(f"- {q}" for q in state.get("sub_questions", [])),
        overview=summaries["overview"],
        consensus="; ".join(summaries["consensus"]),
        debates="; ".join(summaries["debates"]),
        summaries=format_summaries(state["sources"], summaries["perSource"]),
    )
    plan = ask_llm(prompt, AdvisorPlan)

    valid_ids = {s["id"] for s in state["sources"]}
    notes = [
        {"id": f"n{number}", "heading": section.heading, "body": section.body}
        for number, section in enumerate(plan.notes, start=1)
    ]
    tasks = [
        {
            "id": f"t{number}",
            "text": task.text,
            "priority": task.priority,
            "done": False,
            "sourceId": task.source_id if task.source_id in valid_ids else None,
        }
        for number, task in enumerate(plan.tasks, start=1)
    ]

    report("advisor", message=f"Wrote {len(notes)} note sections and {len(tasks)} next steps")
    report("advisor", status="done")

    return {
        "notes": notes,
        "next_steps": {
            "tasks": tasks,
            "questions": plan.open_questions,
            "followUps": plan.follow_up_topics,
        },
    }
