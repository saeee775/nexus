import { Zap, X, ShieldCheck } from 'lucide-react'

const CONFIDENCE_LABEL = {
  high: { text: 'High Confidence', color: 'var(--status-healthy)' },
  medium: { text: 'Medium Confidence', color: 'var(--status-warning)' },
  low: { text: 'Low Confidence', color: 'var(--status-critical)' },
}

/**
 * Decision-grade Simulation & Counterfactual Comparison component.
 * Displays computed disruption cascade, affected customer cohorts,
 * multiple intervention options, and algorithmically selected recommendations.
 */
export default function SimulationResult({
  scenario,
  onClear,
  selectedInterventionId,
  onSelectIntervention,
}) {
  if (!scenario) return null
  const { preview } = scenario
  const confidence = CONFIDENCE_LABEL[preview.confidence] || CONFIDENCE_LABEL.medium
  const cohorts = scenario.simulation?.affectedCustomerCohorts || []
  const interventions = scenario.simulation?.interventions || []
  const recommendation = scenario.simulation?.recommendation

  const activeIntervention =
    interventions.find((i) => i.id === selectedInterventionId) ||
    interventions.find((i) => i.recommended) ||
    recommendation ||
    scenario.simulation?.intervention

  return (
    <div className="insight-block">
      <div className="insight-eyebrow" style={{ justifyContent: 'space-between', display: 'flex' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={12} />
          Simulation & Decision Engine
        </span>
        <button
          onClick={onClear}
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', display: 'flex', cursor: 'pointer' }}
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

      {cohorts.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {cohorts.map((c) => (
            <span
              key={c.id}
              className="insight-path-node"
              style={{ background: 'rgba(139, 124, 255, 0.12)', color: 'var(--accent-primary)', fontSize: 10.5 }}
            >
              {c.label}: {c.cohortSize} customers ({c.revenueShare}% rev)
            </span>
          ))}
        </div>
      )}

      {/* Decision & Counterfactual Interventions */}
      {interventions.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: 'var(--accent-lime)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <ShieldCheck size={12} />
              Intervention Options ({interventions.length})
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Select to simulate</span>
          </div>

          {/* Option Selector Pills */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            {interventions.map((inv, idx) => {
              const isSelected = activeIntervention?.id === inv.id
              return (
                <button
                  key={inv.id}
                  onClick={() => onSelectIntervention?.(inv.id)}
                  style={{
                    background: isSelected ? 'rgba(198, 255, 59, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected ? '1px solid var(--accent-lime)' : '1px solid var(--border-subtle)',
                    color: isSelected ? 'var(--accent-lime)' : 'var(--text-secondary)',
                    borderRadius: 100,
                    padding: '3px 8px',
                    fontSize: 10,
                    fontWeight: isSelected ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Option {String.fromCharCode(65 + idx)}{inv.recommended ? ' ★' : ''}
                </button>
              )
            })}
          </div>

          {/* Selected Action Card */}
          {activeIntervention && (
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.22)',
                border: activeIntervention.recommended
                  ? '1px solid rgba(198, 255, 59, 0.3)'
                  : '1px solid var(--border-subtle)',
                borderRadius: 'var(--r-sm)',
                padding: '9px 10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                <div>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: activeIntervention.recommended ? 'var(--accent-lime)' : 'var(--text-tertiary)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {activeIntervention.recommended ? 'RECOMMENDED MODELED ACTION' : 'COUNTERFACTUAL OPTION'}
                  </span>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                    {activeIntervention.name}
                  </div>
                </div>
                <span
                  title="Modeled revenue protected"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--status-healthy)',
                    background: 'var(--status-healthy-soft)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  +{activeIntervention.formattedRevenueProtected}
                </span>
              </div>

              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.45 }}>
                {activeIntervention.description}
              </p>

              {/* Metric comparison */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 7,
                  paddingTop: 6,
                  borderTop: '1px dashed rgba(255,255,255,0.08)',
                  fontSize: 10.5,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Estimated residual exposure: </span>
                  <strong style={{ color: 'var(--status-warning)' }}>
                    {activeIntervention.formattedRevenueExposureAfter}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-tertiary)' }}>Risk: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {scenario.simulation?.severity?.score || 60} → {activeIntervention.residualSeverity}
                  </strong>
                </div>
              </div>

              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4 }}>
                <strong>Tradeoff:</strong> {activeIntervention.tradeoff}
              </div>

              {activeIntervention.assumptions?.length > 0 && (
                <div style={{ fontSize: 9.5, color: 'var(--text-tertiary)', marginTop: 5, lineHeight: 1.4 }}>
                  <strong style={{ color: 'var(--text-secondary)' }}>Scenario assumptions: </strong>
                  {activeIntervention.assumptions.join(' • ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="insight-path" style={{ justifyContent: 'space-between', marginTop: 10 }}>
        <span className="insight-path-node" style={{ background: 'var(--status-critical-soft)', color: 'var(--status-critical)' }}>
          {preview.impact}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: confidence.color }}>{confidence.text}</span>
      </div>
    </div>
  )
}
