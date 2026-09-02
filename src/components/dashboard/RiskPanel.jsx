import { cascadeRisk } from '../../data/businessData'

/**
 * Cascade risk score + animated propagation pathway. Reusable — the main
 * ecosystem-level risk lives in the Intelligence panel, but this component
 * can also render a scenario-specific risk score when a simulation preview
 * is active (see SimulationResult.jsx).
 */
export default function RiskPanel({ score = cascadeRisk.score, label = cascadeRisk.label, steps = cascadeRisk.steps }) {
  const pct = (score / cascadeRisk.max) * 100

  return (
    <div className="insight-block" style={{ marginTop: 0 }}>
      <div className="insight-eyebrow">Cascade Risk</div>
      <div className="risk-header-row">
        <span className="risk-score">
          {score}
          <span className="risk-score-max"> / {cascadeRisk.max}</span>
        </span>
      </div>
      <div className="risk-bar-track">
        <div className="risk-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="signal-caption" style={{ marginTop: 0 }}>{label}</p>

      <div className="cascade-flow">
        {steps.map((step, i) => (
          <div className="cascade-step" key={i}>
            <span className={`cascade-dot ${step.emphasis ? 'final' : ''}`} />
            <span className="cascade-text">
              {step.emphasis ? <strong>{step.text}</strong> : step.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
