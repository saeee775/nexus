import { HEALTH } from '../../utils/constants'

const HEALTH_LABEL = {
  [HEALTH.HEALTHY]: 'Healthy',
  [HEALTH.WARNING]: 'Watch',
  [HEALTH.CRITICAL]: 'Critical',
}

/**
 * Small pill badge used for health states and status labels.
 * variant: 'healthy' | 'warning' | 'critical' | 'neutral'
 */
export default function Badge({ variant = 'neutral', children }) {
  const label = children ?? HEALTH_LABEL[variant] ?? variant
  return <span className={`badge badge-${variant}`}>{label}</span>
}
