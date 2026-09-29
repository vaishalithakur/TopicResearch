import { useState } from 'react'
import Icon from './Icon.jsx'
import { StatusDot } from './AgentPipeline.jsx'
import SourcesTab from './tabs/SourcesTab.jsx'
import SummariesTab from './tabs/SummariesTab.jsx'
import DraftNotesTab from './tabs/DraftNotesTab.jsx'
import NextStepsTab from './tabs/NextStepsTab.jsx'
import { AGENTS } from '../api/research.js'

const TABS = [
  { id: 'sources', label: 'Sources', icon: 'globe' },
  { id: 'summaries', label: 'Summaries', icon: 'book' },
  { id: 'notes', label: 'Draft Notes', icon: 'file' },
  { id: 'next', label: 'Next Steps', icon: 'listChecks' },
]

// How long one agent took, in seconds (0 if it never finished)
function agentSeconds(agentState) {
  if (!agentState.startedAt || !agentState.finishedAt) return 0
  return (agentState.finishedAt - agentState.startedAt) / 1000
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

// The results screen: a sidebar with stats on the left, tabs on the right
export default function Workspace({ result, agents, onChange, onSearch }) {
  const [activeTab, setActiveTab] = useState('sources')
  const { sources, summaries, notes, nextSteps } = result

  // The little number badge next to each tab name
  const tabCounts = {
    sources: sources.length,
    summaries: summaries.perSource.length,
    notes: notes.length,
    next: nextSteps.tasks.filter((task) => !task.done).length, // only the unfinished ones
  }

  // Numbers for the sidebar
  const highCredibilityCount = sources.filter((source) => source.credibility === 'high').length

  let totalReadingMinutes = 0
  for (const source of sources) {
    totalReadingMinutes += source.readingMinutes || 0
  }
  // minutes -> hours, rounded to one decimal place
  const readingHours = Math.round(totalReadingMinutes / 6) / 10

  let totalRunSeconds = 0
  for (const agent of AGENTS) {
    totalRunSeconds += agentSeconds(agents[agent.id])
  }

  // Left/right arrow keys move between tabs (and wrap around at the ends)
  function handleTabKeys(event) {
    const currentIndex = TABS.findIndex((tab) => tab.id === activeTab)

    if (event.key === 'ArrowRight') {
      const nextIndex = (currentIndex + 1) % TABS.length
      setActiveTab(TABS[nextIndex].id)
    }
    if (event.key === 'ArrowLeft') {
      const prevIndex = (currentIndex - 1 + TABS.length) % TABS.length
      setActiveTab(TABS[prevIndex].id)
    }
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="card sidebar-card">
          <span className="eyebrow">Topic</span>
          <h2 className="sidebar-topic">{result.topic}</h2>
          <p className="muted small">Generated {formatDate(result.generatedAt)}</p>

          <dl className="stats">
            <div><dt>Sources</dt><dd>{sources.length}</dd></div>
            <div><dt>High credibility</dt><dd>{highCredibilityCount}</dd></div>
            <div><dt>Reading time</dt><dd>{readingHours}h</dd></div>
            <div><dt>Themes</dt><dd>{summaries.themes.length}</dd></div>
          </dl>
        </div>

        <div className="card sidebar-card">
          <div className="row between">
            <span className="eyebrow">Agent run</span>
            {totalRunSeconds > 0 && (
              <span className="mono muted small">
                <Icon name="clock" size={12} /> {totalRunSeconds.toFixed(1)}s
              </span>
            )}
          </div>

          <ol className="run-list">
            {AGENTS.map((agent) => {
              const state = agents[agent.id]
              return (
                <li key={agent.id}>
                  <StatusDot status={state.status} />
                  <span>{agent.name}</span>
                  {state.finishedAt && (
                    <span className="mono muted small">{agentSeconds(state).toFixed(1)}s</span>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      </aside>

      <section className="panel">
        <div className="tabs" role="tablist" aria-label="Research workspace" onKeyDown={handleTabKeys}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                className="tab"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon name={tab.icon} size={16} />
                <span>{tab.label}</span>
                <span className="tab-count">{tabCounts[tab.id]}</span>
              </button>
            )
          })}
        </div>

        {/* key={activeTab} makes React rebuild the panel on tab switch, which replays the fade-in */}
        <div
          className="tab-panel"
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          key={activeTab}
        >
          {activeTab === 'sources' && <SourcesTab sources={sources} />}

          {activeTab === 'summaries' && <SummariesTab summaries={summaries} sources={sources} />}

          {activeTab === 'notes' && (
            <DraftNotesTab
              topic={result.topic}
              notes={notes}
              sources={sources}
              onChange={(updatedNotes) => onChange({ ...result, notes: updatedNotes })}
            />
          )}

          {activeTab === 'next' && (
            <NextStepsTab
              nextSteps={nextSteps}
              sources={sources}
              onChange={(updatedNextSteps) => onChange({ ...result, nextSteps: updatedNextSteps })}
              onSearch={onSearch}
            />
          )}
        </div>
      </section>
    </div>
  )
}
