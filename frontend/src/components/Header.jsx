import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import SearchBox from './SearchBox.jsx'
import { isDemoMode } from '../api/research.js'

// Grab the theme the user picked last time (if the browser lets us)
function getSavedTheme() {
  try {
    return localStorage.getItem('theme')
  } catch {
    return null
  }
}

export default function Header({ compact, topic, busy, onSearch, onHome }) {
  // null means "no choice made yet, just follow the system setting"
  const [theme, setTheme] = useState(getSavedTheme)

  // Whenever the theme changes, apply it to the page and remember it
  useEffect(() => {
    if (!theme) return

    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // Storage is blocked (private mode etc). Not a big deal.
    }
  }, [theme])

  function toggleTheme() {
    let isDarkRightNow
    if (theme) {
      isDarkRightNow = theme === 'dark'
    } else {
      isDarkRightNow = window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    setTheme(isDarkRightNow ? 'light' : 'dark')
  }

  return (
    <header className="header">
      <div className="header-inner">
        <button className="brand" onClick={onHome} aria-label="Research Atlas home">
          <span className="brand-mark"><Icon name="compass" size={18} strokeWidth={2} /></span>
          <span className="brand-name">Research Atlas</span>
        </button>

        {/* Small search bar in the header, only once we're past the home screen.
            The key resets the input whenever the topic changes. */}
        {compact && (
          <SearchBox key={topic} initial={topic} busy={busy} onSearch={onSearch} size="sm" />
        )}

        <div className="header-actions">
          {isDemoMode && (
            <span className="pill pill-muted" title="Set VITE_API_URL to connect the LangGraph backend">
              Demo data
            </span>
          )}

          {/* CSS decides which of these two icons is visible */}
          <button className="icon-btn" onClick={toggleTheme} aria-label="Toggle color theme">
            <Icon name="sun" className="only-dark" />
            <Icon name="moon" className="only-light" />
          </button>
        </div>
      </div>
    </header>
  )
}
