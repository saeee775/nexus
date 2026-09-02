import { useState } from 'react'
import { Sparkles, ArrowRight } from 'lucide-react'
import ScenarioCards from '../dashboard/ScenarioCards'
import { scenarios } from '../../data/scenarios'

/**
 * Phase 1 Ask NEXUS bar. Scenario chips drive a controlled mock cascade
 * preview (see App.jsx). Free-text input that doesn't match a known
 * scenario is handled honestly — no fake AI response — since natural
 * language interpretation is a Phase 5 capability (see aiService.js).
 */
export default function AskNexus({ query, onQueryChange, onScenarioSelect, activeScenarioId }) {
  const [unmatched, setUnmatched] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    const match = scenarios.find((s) => s.query.toLowerCase() === query.trim().toLowerCase())
    if (match) {
      setUnmatched(false)
      onScenarioSelect(match)
    } else if (query.trim().length > 0) {
      setUnmatched(true)
    }
  }

  function handleChipSelect(scenario) {
    setUnmatched(false)
    onScenarioSelect(scenario)
  }

  return (
    <div className="command-zone">
      <ScenarioCards onSelect={handleChipSelect} activeScenarioId={activeScenarioId} />

      <form className="command-bar" onSubmit={handleSubmit}>
        <Sparkles size={17} className="command-bar-icon" />
        <input
          className="command-input"
          placeholder="What would you like to stress-test?"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value)
            if (unmatched) setUnmatched(false)
          }}
        />
        <button type="submit" className="command-submit">
          Ask
          <ArrowRight size={14} />
        </button>
      </form>

      {unmatched && (
        <p className="signal-caption" style={{ paddingLeft: 4 }}>
          NEXUS understands guided scenarios in this preview — try one of the suggestions above. Free-form
          reasoning arrives in a later phase.
        </p>
      )}
    </div>
  )
}
