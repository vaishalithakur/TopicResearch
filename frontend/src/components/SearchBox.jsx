import { useState } from 'react'
import Icon from './Icon.jsx'

// The search bar. Comes in two sizes:
//   'lg' - the big one on the home page
//   'sm' - the compact one up in the header
export default function SearchBox({ initial = '', busy = false, onSearch, size = 'lg', autoFocus = false }) {
  const [text, setText] = useState(initial)

  const isBig = size === 'lg'
  const canSubmit = text.trim() !== '' && !busy

  function handleSubmit(event) {
    event.preventDefault() // stop the page from reloading
    onSearch(text)
  }

  // What goes inside the button: a spinner while busy,
  // "Research →" on the big box, and just the arrow on the small one
  let buttonContent
  if (busy) {
    buttonContent = <span className="spinner" />
  } else if (isBig) {
    buttonContent = <>Research <Icon name="arrowRight" size={16} /></>
  } else {
    buttonContent = <Icon name="arrowRight" size={16} />
  }

  const placeholder = isBig
    ? 'e.g. CRISPR gene therapy, carbon capture, transformer interpretability…'
    : 'Research another topic…'

  return (
    <form className={`search search-${size}`} onSubmit={handleSubmit} role="search">
      <Icon name="search" size={isBig ? 20 : 16} className="search-icon" />
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        aria-label="Research topic"
        autoFocus={autoFocus}
      />
      <button className="btn btn-primary" type="submit" disabled={!canSubmit}>
        {buttonContent}
      </button>
    </form>
  )
}
