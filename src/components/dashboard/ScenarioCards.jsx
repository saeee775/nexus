import { Sparkles } from 'lucide-react'
import { scenarios } from '../../data/scenarios'

/**
 * Suggestion chips beneath the Ask NEXUS command bar. Clicking a chip
 * populates the query and triggers a controlled mock scenario preview
 * (see App.jsx `handleScenarioSelect`) rather than a real simulation.
 */
export default function ScenarioCards({ onSelect, activeScenarioId }) {
  return (
    <div className="scenario-chips">
      {scenarios.map((s) => (
        <button
          key={s.id}
          className={`scenario-chip ${activeScenarioId === s.id ? 'active' : ''}`}
          onClick={() => onSelect(s)}
        >
          <Sparkles size={12} />
          {s.prompt}
        </button>
      ))}
    </div>
  )
}
