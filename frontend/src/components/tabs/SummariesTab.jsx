import { useState } from 'react'
import Icon from '../Icon.jsx'

// 0 -> "01", 1 -> "02" ...
function twoDigit(index) {
  return String(index + 1).padStart(2, '0')
}

export default function SummariesTab({ summaries, sources }) {
  // Which source summaries are expanded. We start with the first one open.
  const [openIds, setOpenIds] = useState(() => {
    const firstId = summaries.perSource[0]?.sourceId
    return new Set([firstId])
  })

  // Look up a source by id, e.g. sourcesById['s3']
  const sourcesById = {}
  for (const source of sources) {
    sourcesById[source.id] = source
  }

  const anythingOpen = openIds.size > 0

  // Open it if it's closed, close it if it's open
  function toggleOne(sourceId) {
    setOpenIds((current) => {
      const updated = new Set(current)
      if (updated.has(sourceId)) {
        updated.delete(sourceId)
      } else {
        updated.add(sourceId)
      }
      return updated
    })
  }

  // If anything is open, close everything. Otherwise open everything.
  function toggleAll() {
    if (anythingOpen) {
      setOpenIds(new Set())
    } else {
      const allIds = summaries.perSource.map((item) => item.sourceId)
      setOpenIds(new Set(allIds))
    }
  }

  return (
    <div className="stack">
      {/* The big-picture summary card */}
      <article className="card synthesis">
        <span className="eyebrow"><Icon name="layers" size={14} /> Synthesis</span>
        <p className="synthesis-text">{summaries.overview}</p>

        <div className="theme-grid">
          {summaries.themes.map((theme, index) => (
            <div key={theme.title} className="theme">
              <span className="theme-num mono">{twoDigit(index)}</span>
              <strong>{theme.title}</strong>
              <p>{theme.description}</p>
              <div className="cites">
                {theme.sourceIds.map((id) => (
                  <span key={id} className="cite" title={sourcesById[id]?.title}>{id}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="two-col">
          <div>
            <h4 className="list-head consensus">Consensus</h4>
            <ul className="bullets">
              {summaries.consensus.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="list-head debate">Open debates</h4>
            <ul className="bullets">
              {summaries.debates.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </div>
        </div>
      </article>

      <div className="section-head">
        <h3>Per-source summaries</h3>
        <button className="btn btn-ghost btn-sm" onClick={toggleAll}>
          {anythingOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      {/* One collapsible row per source */}
      <div className="accordion">
        {summaries.perSource.map((item) => {
          const source = sourcesById[item.sourceId]
          const isOpen = openIds.has(item.sourceId)

          return (
            <div key={item.sourceId} className={`acc-item ${isOpen ? 'open' : ''}`}>
              <button
                className="acc-trigger"
                onClick={() => toggleOne(item.sourceId)}
                aria-expanded={isOpen}
              >
                <span className="cite">{item.sourceId}</span>
                <span className="acc-title">
                  <strong>{source?.title ?? item.sourceId}</strong>
                  <span className="muted small">{item.tldr}</span>
                </span>
                <Icon name="chevronDown" size={18} className="acc-chevron" />
              </button>

              {isOpen && (
                <div className="acc-body">
                  <ul className="bullets">
                    {item.keyPoints.map((point) => <li key={point}>{point}</li>)}
                  </ul>

                  {source && (
                    <a className="text-link small" href={source.url} target="_blank" rel="noreferrer">
                      Open source <Icon name="external" size={12} />
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
