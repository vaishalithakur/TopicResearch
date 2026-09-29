import { useRef, useState } from 'react'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import AgentPipeline from './components/AgentPipeline.jsx'
import Workspace from './components/Workspace.jsx'
import Icon from './components/Icon.jsx'
import { AGENTS, runResearch } from './api/research.js'

// Every agent starts out like this before a run kicks off.
function makeFreshAgentState() {
  const agentState = {}
  for (const agent of AGENTS) {
    agentState[agent.id] = {
      status: 'pending',
      logs: [],
      startedAt: null,
      finishedAt: null,
    }
  }
  return agentState
}

// The backend sends us little updates like { agent: 'retriever', status: 'running' }
// or { agent: 'retriever', message: 'Found 14 sources' }. This folds one of those
// updates into our agent state.
function updateAgentFromEvent(allAgents, event) {
  const { agent: agentId, status, message } = event
  const agent = allAgents[agentId]

  // Unknown agent? Just ignore it.
  if (!agent) return allAgents

  const now = Date.now()

  const updatedAgent = {
    status: status ?? agent.status,
    logs: message ? [...agent.logs, message] : agent.logs,
    startedAt: status === 'running' ? now : agent.startedAt,
    finishedAt: status === 'done' ? now : agent.finishedAt,
  }

  return { ...allAgents, [agentId]: updatedAgent }
}

export default function App() {
  // What screen are we on? 'idle' (home), 'running', 'done' or 'error'
  const [phase, setPhase] = useState('idle')
  const [topic, setTopic] = useState('')
  const [agents, setAgents] = useState(makeFreshAgentState)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Lets us cancel a run that's still in progress
  const cancelRef = useRef(null)

  async function startResearch(searchText) {
    const cleanTopic = searchText.trim()
    if (!cleanTopic) return

    // If something is already running, stop it first
    cancelRef.current?.abort()
    const controller = new AbortController()
    cancelRef.current = controller

    // Reset everything for the new run
    setTopic(cleanTopic)
    setPhase('running')
    setAgents(makeFreshAgentState())
    setResult(null)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    try {
      const data = await runResearch(cleanTopic, {
        signal: controller.signal,
        onAgentEvent: (event) => {
          setAgents((current) => updateAgentFromEvent(current, event))
        },
      })
      setResult(data)
      setPhase('done')
    } catch (err) {
      // The user cancelled on purpose, so that's not really an error
      if (err.name === 'AbortError') return

      setError(err.message)
      setPhase('error')
    }
  }

  function goBackHome() {
    cancelRef.current?.abort()
    setPhase('idle')
    setTopic('')
    setResult(null)
    setError(null)
  }

  const isRunning = phase === 'running'

  return (
    <div className="app">
      <Header
        compact={phase !== 'idle'}
        topic={topic}
        busy={isRunning}
        onSearch={startResearch}
        onHome={goBackHome}
      />

      <main className="main">
        {phase === 'idle' && <Hero onSearch={startResearch} />}

        {phase === 'running' && (
          <AgentPipeline topic={topic} agents={agents} onCancel={goBackHome} />
        )}

        {phase === 'error' && (
          <div className="error-state card">
            <Icon name="alert" size={28} />
            <h2>The research run failed</h2>
            <p>{error}</p>
            <div className="row gap-sm">
              <button className="btn btn-primary" onClick={() => startResearch(topic)}>
                <Icon name="refresh" size={16} /> Try again
              </button>
              <button className="btn btn-ghost" onClick={goBackHome}>New topic</button>
            </div>
          </div>
        )}

        {phase === 'done' && result && (
          <Workspace
            result={result}
            agents={agents}
            onChange={setResult}
            onSearch={startResearch}
          />
        )}
      </main>
    </div>
  )
}
