import { buildMockResearch, MOCK_AGENT_LOGS } from '../data/mockResearch.js'

// Backend URL from .env (trailing slash removed so we don't end up with "//research")
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '')

// No backend URL means we just use fake demo data
export const isDemoMode = !API_URL

// Our two agents, in the order they run. The backend refers to them by these ids.
export const AGENTS = [
  {
    id: 'retriever',
    name: 'Source Retriever',
    icon: 'globe',
    role: 'Fetches papers, articles and reports from the web and scholarly indexes.',
  },
  {
    id: 'analyst',
    name: 'Research Analyst',
    icon: 'layers',
    role: 'Summarizes each source, finds themes and debates, drafts notes and next steps.',
  },
]

/*
  Kicks off a research run and calls onAgentEvent whenever an agent reports progress.

  How the backend talks to us:
  We POST { topic } to {VITE_API_URL}/research and it streams back one JSON
  object per line. Each line is one of these:

    { "type": "agent",  "agent": "retriever", "status": "running" | "done" | "error", "message": "..." }
    { "type": "result", "data": { sources, summaries, notes, nextSteps } }
    { "type": "error",  "message": "..." }
*/
export async function runResearch(topic, { onAgentEvent, signal }) {
  if (isDemoMode) {
    return runFakeResearch(topic, onAgentEvent, signal)
  }

  const response = await fetch(`${API_URL}/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`Research service responded with ${response.status}`)
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()

  // Chunks don't always end on a clean line, so we hold onto any leftover
  // half-line here until the rest of it shows up.
  let leftover = ''
  let finalResult = null

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    leftover += value
    const lines = leftover.split('\n')
    leftover = lines.pop() // last bit might be incomplete, keep it for next time

    for (const line of lines) {
      if (!line.trim()) continue

      const event = JSON.parse(line)

      if (event.type === 'agent') {
        onAgentEvent(event)
      } else if (event.type === 'result') {
        finalResult = event.data
      } else if (event.type === 'error') {
        throw new Error(event.message)
      }
    }
  }

  if (!finalResult) {
    throw new Error('The research run ended without a result.')
  }

  return {
    topic,
    generatedAt: new Date().toISOString(),
    ...finalResult,
  }
}

// Like setTimeout but as a promise, and it bails out early if the run is cancelled
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)

    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

// Pretends to be the backend so the app still works without one.
// Each agent "thinks" for a bit and posts its log lines one by one.
async function runFakeResearch(topic, onAgentEvent, signal) {
  for (const agent of AGENTS) {
    onAgentEvent({ agent: agent.id, status: 'running' })

    const logLines = MOCK_AGENT_LOGS[agent.id](topic)
    for (const message of logLines) {
      const randomDelay = 350 + Math.random() * 350
      await sleep(randomDelay, signal)
      onAgentEvent({ agent: agent.id, message })
    }

    await sleep(250, signal)
    onAgentEvent({ agent: agent.id, status: 'done' })
  }

  return buildMockResearch(topic)
}
