import { useState } from 'react'
import Icon from '../Icon.jsx'

// Nicer names for the source types we know about
const TYPE_LABELS = {
  paper: 'Paper',
  article: 'Article',
  report: 'Report',
  video: 'Video',
}

// The ways you can sort the list
const SORT_FUNCTIONS = {
  relevance: (a, b) => b.relevance - a.relevance,      // most relevant first
  year: (a, b) => (b.year ?? 0) - (a.year ?? 0),       // newest first
}

// Fall back to the raw type if it's one we don't have a label for
function typeLabel(type) {
  return TYPE_LABELS[type] ?? type
}

export default function SourcesTab({ sources }) {
  const [typeFilter, setTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('relevance')

  // "all" plus every type that actually shows up, no duplicates
  const filterOptions = ['all', ...new Set(sources.map((source) => source.type))]

  const visibleSources = sources
    .filter((source) => typeFilter === 'all' || source.type === typeFilter)
    .sort(SORT_FUNCTIONS[sortBy])

  function countForType(type) {
    if (type === 'all') return sources.length
    return sources.filter((source) => source.type === type).length
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Filter by type">
          {filterOptions.map((type) => (
            <button
              key={type}
              className={typeFilter === type ? 'active' : ''}
              onClick={() => setTypeFilter(type)}
            >
              {type === 'all' ? 'All' : `${typeLabel(type)}s`}
              <span className="muted">{countForType(type)}</span>
            </button>
          ))}
        </div>

        <label className="select">
          <span className="muted small">Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="relevance">Relevance</option>
            <option value="year">Newest</option>
          </select>
        </label>
      </div>

      <div className="source-grid">
        {visibleSources.map((source, index) => {
          // relevance comes in as 0-1, we show it as 0-100
          const relevancePercent = Math.round(source.relevance * 100)

          return (
            <article key={source.id} className="card source-card" style={{ '--i': index }}>
              <div className="source-meta">
                <span className={`badge badge-${source.type}`}>{typeLabel(source.type)}</span>
                <span className="muted small">{source.publisher}{source.year && ` · ${source.year}`}</span>
                <span className="mono muted small source-id">{source.id}</span>
              </div>

              <h3 className="source-title">
                <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>
              </h3>

              <p className="source-snippet">{source.snippet}</p>

              <div className="source-foot">
                <div className="relevance" title={`Relevance ${relevancePercent}%`}>
                  <span className="muted small">Relevance</span>
                  <div className="meter">
                    <div style={{ width: `${source.relevance * 100}%` }} />
                  </div>
                  <span className="mono small">{relevancePercent}</span>
                </div>

                <span className={`cred cred-${source.credibility}`}>{source.credibility} credibility</span>

                {source.readingMinutes && (
                  <span className="muted small">
                    <Icon name="clock" size={12} /> {source.readingMinutes} min
                  </span>
                )}

                <a
                  className="link-btn"
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${source.title}`}
                >
                  <Icon name="external" size={15} />
                </a>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
