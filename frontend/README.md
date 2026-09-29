# Research Atlas — frontend

React + Vite UI for the multi-agent research assistant. Enter a topic, watch the agents
(Query Planner → Source Retriever → Summarizer → Synthesizer → Research Advisor) run, and
get a workspace with **Sources**, **Summaries**, **Draft Notes** and **Next Steps** tabs.

```bash
npm install
npm run dev
```

## Demo mode vs. backend

With no `VITE_API_URL` set, the app runs a simulated agent pipeline with demo data
(see `src/data/mockResearch.js`). To connect the LangGraph backend, copy `.env.example`
to `.env` and set `VITE_API_URL`.

The frontend calls `POST {VITE_API_URL}/research` with `{ "topic": "..." }` and expects a
newline-delimited JSON stream:

```jsonl
{"type":"agent","agent":"planner","status":"running"}
{"type":"agent","agent":"planner","message":"Built 9 search queries"}
{"type":"agent","agent":"planner","status":"done"}
{"type":"result","data":{"sources":[...],"summaries":{...},"notes":[...],"nextSteps":{...}}}
```

Agent ids: `planner`, `retriever`, `summarizer`, `synthesizer`, `advisor`.
The `result.data` shape matches what `buildMockResearch()` returns.

## Structure

```
src/
  api/research.js          agent list, backend client, mock runner
  data/mockResearch.js     demo data
  components/
    Header, SearchBox, Hero, AgentPipeline, Workspace, Icon
    tabs/                  SourcesTab, SummariesTab, DraftNotesTab, NextStepsTab
```
