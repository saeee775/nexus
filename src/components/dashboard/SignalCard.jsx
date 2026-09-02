import { ArrowUpRight } from 'lucide-react'

/**
 * `variant="hero"` — one primary signal (Revenue) rendered large, borderless,
 * typography-led. `variant="compact"` (default) — a borderless list row for
 * secondary signals, separated by a hairline rather than individual card
 * chrome, so the rail reads as an editorial module, not four repeated cards.
 */
export default function SignalCard({ icon: Icon, accent, label, value, caption, delta, variant = 'compact' }) {
  if (variant === 'hero') {
    return (
      <div className="signal-hero">
        <span className="signal-label">
          <span className="signal-icon-wrap" style={{ background: `${accent}20`, color: accent }}>
            <Icon size={14} />
          </span>
          {label}
        </span>
        <div className="signal-value-row" style={{ marginTop: 8 }}>
          <span className="signal-value" style={{ fontSize: 34 }}>
            {value}
          </span>
          {typeof delta === 'number' && (
            <span className={`metric-delta ${delta >= 0 ? 'up' : 'down'}`}>
              <ArrowUpRight size={12} style={{ transform: delta < 0 ? 'rotate(90deg)' : 'none' }} />
              {Math.abs(delta)}%
            </span>
          )}
        </div>
        {caption && <p className="signal-caption">{caption}</p>}
      </div>
    )
  }

  return (
    <div className="signal-list-item">
      <span className="signal-label">
        <span className="signal-icon-wrap" style={{ background: `${accent}1f`, color: accent }}>
          <Icon size={13} />
        </span>
        <span>
          {label}
          {caption && <span className="signal-list-caption">{caption}</span>}
        </span>
      </span>
      <span className="signal-value" style={{ fontSize: 17 }}>
        {value}
      </span>
    </div>
  )
}
