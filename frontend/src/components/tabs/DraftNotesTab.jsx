import { useState } from 'react'
import Icon from '../Icon.jsx'

// Glue the notes and the source list together into one Markdown document
function buildMarkdown(topic, notes, sources) {
  const sections = notes
    .map((note) => `## ${note.heading}\n\n${note.body}`)
    .join('\n\n')

  const references = sources
    .map((source) => {
      const yearPart = source.year ? `, ${source.year}` : ''
      return `- [${source.id}] ${source.title}. ${source.publisher}${yearPart}. ${source.url}`
    })
    .join('\n')

  return `# ${topic}\n\n${sections}\n\n## Sources\n\n${references}\n`
}

// "Solid-State Batteries!" -> "solid-state-batteries"
function makeFileName(topic) {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // anything that isn't a letter/number becomes a dash
    .replace(/^-|-$/g, '')       // no dashes hanging off the ends
  return `${slug}-notes.md`
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length
}

export default function DraftNotesTab({ topic, notes, sources, onChange }) {
  const [justCopied, setJustCopied] = useState(false)

  let totalWords = 0
  for (const note of notes) {
    totalWords += countWords(note.body)
  }

  // Change one field (heading or body) on one note
  function updateNote(noteId, field, newValue) {
    const updatedNotes = notes.map((note) => {
      if (note.id !== noteId) return note
      return { ...note, [field]: newValue }
    })
    onChange(updatedNotes)
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(buildMarkdown(topic, notes, sources))

    // Show "Copied" for a moment, then flip back
    setJustCopied(true)
    setTimeout(() => setJustCopied(false), 1800)
  }

  // Browsers don't have a "save file" function, so the trick is to make a
  // hidden link to the file and click it ourselves
  function downloadFile() {
    const markdown = buildMarkdown(topic, notes, sources)
    const file = new Blob([markdown], { type: 'text/markdown' })
    const fileUrl = URL.createObjectURL(file)

    const link = document.createElement('a')
    link.href = fileUrl
    link.download = makeFileName(topic)
    link.click()

    URL.revokeObjectURL(fileUrl) // tidy up
  }

  return (
    <div className="notes-layout">
      <nav className="notes-outline" aria-label="Outline">
        <span className="eyebrow">Outline</span>
        <ol>
          {notes.map((note) => (
            <li key={note.id}>
              <a href={`#note-${note.id}`}>{note.heading || 'Untitled'}</a>
            </li>
          ))}
        </ol>
        <p className="muted small">{totalWords} words</p>
      </nav>

      <div className="stack">
        <div className="toolbar">
          <p className="muted small">
            <Icon name="pen" size={13} /> Drafted by the Research Advisor. Everything is editable.
          </p>

          <div className="row gap-sm">
            <button className="btn btn-ghost btn-sm" onClick={copyToClipboard}>
              <Icon name={justCopied ? 'check' : 'copy'} size={14} /> {justCopied ? 'Copied' : 'Copy Markdown'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={downloadFile}>
              <Icon name="download" size={14} /> Export .md
            </button>
          </div>
        </div>

        <article className="card doc">
          <h2 className="doc-title">{topic}</h2>

          {notes.map((note) => {
            // Make the text box tall enough to fit what's in it, plus a spare line
            const lineCount = note.body.split('\n').length
            const rows = Math.max(2, lineCount + 1)

            return (
              <section key={note.id} id={`note-${note.id}`} className="doc-section">
                <input
                  className="doc-heading"
                  value={note.heading}
                  onChange={(event) => updateNote(note.id, 'heading', event.target.value)}
                  aria-label="Section heading"
                />
                <textarea
                  className="doc-body"
                  value={note.body}
                  onChange={(event) => updateNote(note.id, 'body', event.target.value)}
                  rows={rows}
                  aria-label={`${note.heading} content`}
                />
              </section>
            )
          })}
        </article>
      </div>
    </div>
  )
}
