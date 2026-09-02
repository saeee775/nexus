import { Zap, X } from 'lucide-react'

const CONFIDENCE_LABEL = {
  high: { text: 'High Confidence', color: 'var(--status-healthy)' },
  medium: { text: 'Medium Confidence', color: 'var(--status-warning)' },
  low: { text: 'Low Confidence', color: 'var(--status-critical)' },
}

/**
 * Controlled mock scenario preview — Phase 1 does not run a real simulation.
 * Content comes directly from the matched scenario's `preview` field in
 * src/data/scenarios.js. The Phase 2 simulation engine replaces this with
 * a computed cascading impact timeline.
 */
export default function SimulationResult({ scenario, onClear }) {
  if (!scenario) return null
  const { preview } = scenario
  const confidence = CONFIDENCE_LABEL[preview.confidence] || CONFIDENCE_LABEL.medium

  return (
    <div className="insight-block">
      <div className="insight-eyebrow" style={{ justifyContent: 'space-between', display: 'flex' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={12} />
          Simulation Preview
        </span>
        <button
          onClick={onClear}
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', display: 'flex' }}
          aria-label="Clear simulation preview"
        >
          <X size={13} />
        </button>
      </div>

      <p className="insight-text">
        <strong>{preview.headline}</strong>
      </p>
      <p className="insight-text" style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
        {preview.body}
      </p>

      <div className="insight-path" style={{ justifyContent: 'space-between' }}>
        <span className="insight-path-node" style={{ background: 'var(--status-critical-soft)', color: 'var(--status-critical)' }}>
          {preview.impact}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: confidence.color }}>{confidence.text}</span>
      </div>
    </div>
  )
}
