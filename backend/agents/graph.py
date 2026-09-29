"""The research workflow, built with LangGraph.

    START -> retriever -> analyst -> END

Each agent is a node: a function that takes the shared ResearchState and returns
the fields it wants to update. LangGraph runs them in order and merges the updates.

Only the analyst calls Gemini, and only once, so a full run is a single LLM request.
"""

from langgraph.graph import END, START, StateGraph

from agents.analyst import analyst
from agents.retriever import retriever
from agents.state import ResearchState


def build_research_graph():
    graph = StateGraph(ResearchState)

    graph.add_node("retriever", retriever)
    graph.add_node("analyst", analyst)

    graph.add_edge(START, "retriever")
    graph.add_edge("retriever", "analyst")
    graph.add_edge("analyst", END)

    return graph.compile()


research_graph = build_research_graph()
