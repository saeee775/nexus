import { NODE_TYPES } from '../../utils/constants'

const FIELD_SETS = {
  [NODE_TYPES.SUPPLIER]: [
    { key: 'reliability', label: 'Reliability', suffix: '%', priority: 90 },
    { key: 'leadTime', label: 'Lead Time', priority: 80 },
    { key: 'revenueAtRisk', label: 'Revenue at Risk', priority: 85 },
    { key: 'dependency', label: 'Dependency', suffix: '%', priority: 60 },
  ],
  [NODE_TYPES.PRODUCT]: [
    { key: 'directRevenue', label: 'Direct Revenue', suffix: '%', priority: 70 },
    { key: 'downstreamInfluence', label: 'Downstream', suffix: '%', priority: 85 },
    { key: 'stockDaysLeft', label: 'Inventory Days', priority: 80 },
    { key: 'dependency', label: 'Dependency', suffix: '%', priority: 60 },
  ],
  [NODE_TYPES.BUNDLE]: [
    { key: 'directRevenue', label: 'Direct Revenue', suffix: '%', priority: 75 },
    { key: 'downstreamInfluence', label: 'Downstream', suffix: '%', priority: 80 },
    { key: 'margin', label: 'Margin', suffix: '%', priority: 70 },
    { key: 'dependency', label: 'Dependency', suffix: '%', priority: 60 },
  ],
  [NODE_TYPES.CUSTOMER_COHORT]: [
    { key: 'revenueShare', label: 'Revenue Share', suffix: '%', priority: 90 },
    { key: 'cohortSize', label: 'Cohort Size', priority: 65 },
    { key: 'avgOrderValue', label: 'Avg Order', priority: 70 },
    { key: 'dependency', label: 'Dependency', suffix: '%', priority: 60 },
  ],
  [NODE_TYPES.SIGNAL]: [
    { key: 'successRate', label: 'Success Rate', suffix: '%', priority: 90 },
    { key: 'avgTicket', label: 'Avg Ticket', priority: 70 },
    { key: 'dailyVolume', label: 'Daily Volume', priority: 65 },
    { key: 'revenueFlow', label: 'Revenue Flow', suffix: '%', priority: 75 },
  ],
  [NODE_TYPES.REVENUE]: [
    { key: 'monthly', label: 'Monthly', priority: 95 },
    { key: 'atRisk', label: 'At Risk', priority: 90 },
    { key: 'growth', label: 'Growth', suffix: '%', priority: 70 },
    { key: 'riskSensitivity', label: 'Risk Sensitivity', suffix: '%', priority: 65 },
  ],
}

export function constellationItems(node) {
  const fields = FIELD_SETS[node.type] || []
  return fields
    .map((f) => ({ ...f, value: node.metrics?.[f.key] }))
    .filter((f) => f.value !== undefined && f.value !== null)
    .map((f) => ({
      id: f.key,
      w: 92,
      h: 36,
      priority: f.priority,
      label: f.label,
      value: `${f.value}${f.suffix || ''}`,
    }))
}

export default function NodeConstellation({ r, placements }) {
  const items = placements || []

  return (
    <g className="constellation" style={{ pointerEvents: 'none' }}>
      {items.map((field, i) => {
        const satX = field.dx
        const satY = field.dy
        const originX = Math.sign(satX || 1) * (r + 3)
        const originY = Math.sign(satY || 1) * (r * 0.35)

        return (
          <g key={field.id} className="constellation-satellite" style={{ animationDelay: `${i * 55}ms` }}>
            <line
              x1={originX}
              y1={originY}
              x2={satX + (satX > 0 ? -28 : 28)}
              y2={satY}
              stroke="var(--border-soft)"
              strokeWidth={0.8}
              opacity={0.7}
            />
            <text x={satX} y={satY - 4} textAnchor="middle" className="constellation-value">
              {field.value}
            </text>
            <text x={satX} y={satY + 11} textAnchor="middle" className="constellation-label">
              {field.label}
            </text>
          </g>
        )
      })}
    </g>
  )
}
