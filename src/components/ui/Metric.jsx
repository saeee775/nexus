/**
 * Large numeric display used for hero metrics (revenue, risk score, etc).
 * Uses Space Grotesk via the .metric-value / .risk-score classes for
 * deliberate visual weight on important numbers.
 */
export default function Metric({ value, size = 22, className = '', unit }) {
  return (
    <span className={`metric-value ${className}`} style={{ fontSize: size }}>
      {value}
      {unit && <span style={{ fontSize: size * 0.5, marginLeft: 2, color: 'var(--text-tertiary)' }}>{unit}</span>}
    </span>
  )
}
