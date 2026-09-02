import { Sparkles } from 'lucide-react'

/**
 * Replaces what used to live inside the rectangular NodeInspector card.
 * One concise narrative sentence per selected node (from businessData's
 * `insight` field) plus a lightweight confidence read — not a metrics
 * dump, since those now live in the graph itself as NodeConstellation
 * satellites.
 */
export default function NodeObservation({ node }) {
  const confidence = node.health === 'healthy' ? 'Medium' : 'High'

  return (
    <div className="insight-block">
      <div className="insight-eyebrow">
        <Sparkles size={12} />
        NEXUS Observation — {node.label}
      </div>
      <p className="insight-text">{node.insight}</p>
      <div className="insight-path" style={{ justifyContent: 'flex-start' }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>
          Confidence: <span style={{ color: 'var(--accent-primary)' }}>{confidence}</span>
        </span>
      </div>
    </div>
  )
}
