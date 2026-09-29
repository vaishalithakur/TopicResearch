import Icon from './Icon.jsx'
import { AGENTS } from '../api/research.js'

// Little circle that shows how an agent is doing: spinner, tick, warning, or empty
export function StatusDot({ status }) {
  if (status === 'running') {
    return (
      <span className="status status-running">
        <span className="spinner" />
      </span>
    )
  }

  if (status === 'done') {
    return (
      <span className="status status-done">
        <Icon name="check" size={13} strokeWidth={2.5} />
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="status status-error">
        <Icon name="alert" size={13} />
      </span>
    )
  }

  // Still waiting its turn
  return <span className="status status-pending" />
}

// How long an agent took, e.g. "3.2s"
function formatDuration(agentState) {
  const seconds = (agentState.finishedAt - agentState.startedAt) / 1000
  return `${seconds.toFixed(1)}s`
}

// The screen you see while the agents are working away
export default function AgentPipeline({ topic, agents, onCancel }) {
  const finishedCount = AGENTS.filter((agent) => agents[agent.id].status === 'done').length
  const percentDone = (finishedCount / AGENTS.length) * 100

  // Always show a tiny sliver of the bar so it doesn't look broken at 0%
  const barWidth = Math.max(percentDone, 4)

  return (
    <section className="pipeline">
      <div className="pipeline-head">
        <span className="eyebrow">Researching</span>
        <h1>{topic}</h1>

        <div
          className="progress"
          role="progressbar"
          aria-valuenow={Math.round(percentDone)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-bar" style={{ width: `${barWidth}%` }} />
        </div>

        <p className="muted small">{finishedCount} of {AGENTS.length} agents finished</p>
      </div>

      <ol className="pipeline-list">
        {AGENTS.map((agent) => {
          const state = agents[agent.id]
          const showTime = state.status === 'done' && state.startedAt

          return (
            <li key={agent.id} className={`pipeline-item is-${state.status}`}>
              <div className="pipeline-rail">
                <StatusDot status={state.status} />
              </div>

              <div className="pipeline-body">
                <div className="pipeline-title">
                  <span className="agent-icon"><Icon name={agent.icon} size={16} /></span>
                  <strong>{agent.name}</strong>
                  {showTime && <span className="mono muted small">{formatDuration(state)}</span>}
                </div>

                <p className="muted small">{agent.role}</p>

                {state.logs.length > 0 && (
                  <ul className="log">
                    {state.logs.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <button className="btn btn-ghost pipeline-cancel" onClick={onCancel}>Cancel</button>
    </section>
  )
}
