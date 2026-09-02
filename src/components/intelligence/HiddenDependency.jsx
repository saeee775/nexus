import { Eye, AlertCircle } from 'lucide-react'
import { hiddenDependency } from '../../data/businessData'

export default function HiddenDependency({ onView }) {
  return (
    <div className="insight-block">
      <div className="insight-eyebrow">
        <AlertCircle size={12} />
        {hiddenDependency.title}
      </div>
      <p className="insight-text">
        <strong>Product X</strong> generates only <strong>8%</strong> of direct revenue but influences{' '}
        <strong>31%</strong> of downstream revenue.
      </p>

      <div className="insight-path">
        {hiddenDependency.path.map((label, i) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="insight-path-node">{label}</span>
            {i < hiddenDependency.path.length - 1 && <span style={{ color: 'var(--text-tertiary)' }}>→</span>}
          </span>
        ))}
      </div>

      <button className="insight-btn" onClick={() => onView(hiddenDependency.nodeId)}>
        <Eye size={13} />
        View dependency
      </button>
    </div>
  )
}
