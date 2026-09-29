# Research Atlas: multi-agent research assistant

Enter a topic, and two AI agents research it for you. You get a dashboard with
**Sources**, **Summaries**, **Draft Notes** and **Next Steps**.

```
TopicResearch/
├── frontend/   React + Vite UI
├── backend/    FastAPI server (API + streaming)
└── agents/     LangGraph workflow (the two agents)
```

## How it works

```
React UI ──POST /research──► FastAPI ──► LangGraph workflow
    ▲                                        │
    └──── live progress + final result ◄─────┘   (newline-delimited JSON stream)

START → Source Retriever → Research Analyst → END
```

| Agent | File | What it does | Uses Gemini? |
|---|---|---|---|
| Source Retriever | `agents/retriever.py` | Searches arXiv, Wikipedia and (optionally) the web | No |
| Research Analyst | `agents/analyst.py` | Scores relevance and summarizes each source (keeps the top 8), finds themes, consensus and debates, writes draft notes, next steps and follow-up topics | Yes |

A full run makes **1 Gemini request**. If Gemini is busy (503) or rate limited (429), that one
request is retried with a growing wait, then `GEMINI_FALLBACK_MODELS` are tried.

Other files in `agents/`:
- `graph.py` connects the agents into a LangGraph workflow
- `state.py` holds the data the agents share
- `schemas.py` defines the structured answers we ask Gemini for
- `search_tools.py` has the arXiv, Wikipedia and Tavily searches
- `llm.py` sets up Gemini
- `progress.py` sends live updates to the UI

## Setup

You need Python 3.11+ and Node.js 20+.

### 1. Get API keys (all free)

| Key | Where | Required? |
|---|---|---|
| `GOOGLE_API_KEY` | https://aistudio.google.com/apikey | Yes |
| `LANGSMITH_API_KEY` | https://smith.langchain.com → Settings → API Keys | Recommended |
| `TAVILY_API_KEY` | https://app.tavily.com | Optional: adds web articles and reports |

### 2. Backend

Run these from the project root (`TopicResearch/`):

```powershell
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r backend/requirements.txt

copy backend\.env.example backend\.env    # macOS/Linux: cp backend/.env.example backend/.env
# now open backend/.env and paste your keys

uvicorn backend.main:app --reload --port 8000
```

Check http://localhost:8000/health. It shows whether each key was picked up.
Interactive API docs are at http://localhost:8000/docs.

> **Note:** keep the project root as your working directory when running `uvicorn`, so Python
> can find both the `backend` and `agents` packages.

### 3. Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. `frontend/.env` points the app at `http://localhost:8000`.
Delete that line to go back to demo data without the backend.

## Observability with LangSmith

With `LANGSMITH_TRACING=true` and `LANGSMITH_API_KEY` set, every research run shows up in
LangSmith under the project in `LANGSMITH_PROJECT` (default `research-atlas`). No extra code is needed.
Each run is named `research`, tagged `research-atlas`, and has the topic in its metadata. Inside it
you can see each agent, each search call (arXiv, Wikipedia, web), and every Gemini prompt and response
with token counts and timing.

## API

`POST /research` with body `{"topic": "Solid-state batteries"}` returns a stream, one JSON object per line:

```jsonl
{"type": "agent", "agent": "retriever", "status": "running"}
{"type": "agent", "agent": "retriever", "message": "Collected 12 unique sources"}
{"type": "agent", "agent": "retriever", "status": "done"}
...
{"type": "result", "data": {"sources": [...], "summaries": {...}, "notes": [...], "nextSteps": {...}}}
```

If something fails, you get `{"type": "error", "message": "..."}` instead of a result.

Try it without the UI:

```powershell
curl.exe -N -X POST http://localhost:8000/research -H "Content-Type: application/json" -d "{\"topic\": \"Solid-state batteries\"}"
```

## Troubleshooting

- **"rate limit was reached"**: the Gemini free tier limits requests per minute. Wait a minute and retry.
- **"model ... was not found"**: set `GEMINI_MODEL` in `backend/.env` to a model listed at
  https://ai.google.dev/gemini-api/docs/models (for example `gemini-2.5-flash`).
- **"DLL load failed ... An Application Control policy has blocked this file"** (Windows): Smart App
  Control blocked a newly released compiled package. `requirements.txt` already pins `uuid-utils`
  to a version that loads. If another package hits this, install its previous version.
- **Only arXiv and Wikipedia sources**: add a `TAVILY_API_KEY` to include web articles and reports.
- **Summaries are short**: the agents summarize from abstracts and search snippets, not full papers.
