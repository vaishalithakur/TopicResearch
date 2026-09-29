from langgraph.config import get_stream_writer


def report(agent: str, status: str | None = None, message: str | None = None) -> None:
    """Send a live progress update for one agent.

    These updates are streamed to the frontend (the agent timeline you see while
    research is running). `status` is "running" or "done"; `message` is a log line.
    Outside of a streaming run this does nothing.
    """
    event = {"type": "agent", "agent": agent}
    if status:
        event["status"] = status
    if message:
        event["message"] = message
    get_stream_writer()(event)
