import Icon from './Icon.jsx'
import SearchBox from './SearchBox.jsx'
import { AGENTS } from '../api/research.js'

// Quick ideas people can click instead of typing
const EXAMPLE_TOPICS = [
  'Microplastics in drinking water',
  'Retrieval-augmented generation',
  'Four-day work week productivity',
  'Solid-state batteries',
]

// A sneak peek of what you get at the end
const WHAT_YOU_GET = [
  { icon: 'globe', title: 'Sources', text: 'Ranked by relevance and credibility' },
  { icon: 'book', title: 'Summaries', text: 'TL;DRs, themes, consensus and debates' },
  { icon: 'file', title: 'Draft Notes', text: 'Editable, cited, exportable to Markdown' },
  { icon: 'listChecks', title: 'Next Steps', text: 'Prioritised tasks and follow-up topics' },
]

// Turns 0 into "01", 1 into "02" and so on
function stepNumber(index) {
  return String(index + 1).padStart(2, '0')
}

// The home screen
export default function Hero({ onSearch }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow"><Icon name="sparkle" size={14} /> Multi-agent research assistant</span>
        <h1>Research any topic with a team of agents.</h1>
        <p className="lede">
          Enter a topic. Five agents plan the search, fetch sources, summarise them and turn
          the findings into a structured workspace you can build on.
        </p>
      </div>

      <SearchBox onSearch={onSearch} autoFocus />

      <div className="examples">
        <span className="muted">Try</span>
        {EXAMPLE_TOPICS.map((example) => (
          <button key={example} className="chip" onClick={() => onSearch(example)}>
            {example}
          </button>
        ))}
      </div>

      {/* The --i variable is used by the CSS to stagger the fade-in animation */}
      <ol className="agent-strip">
        {AGENTS.map((agent, index) => (
          <li key={agent.id} className="agent-strip-item" style={{ '--i': index }}>
            <span className="agent-strip-step">{stepNumber(index)}</span>
            <span className="agent-icon"><Icon name={agent.icon} size={18} /></span>
            <strong>{agent.name}</strong>
            <p>{agent.role}</p>
          </li>
        ))}
      </ol>

      <div className="hero-tabs-preview">
        {WHAT_YOU_GET.map((item) => (
          <div key={item.title} className="preview-item">
            <Icon name={item.icon} size={16} />
            <div>
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
