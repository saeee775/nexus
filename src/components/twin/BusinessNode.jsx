import {
  Truck,
  Package,
  Layers,
  Users,
  IndianRupee,
  Zap,
} from 'lucide-react'
import { NODE_TYPES, HEALTH_COLOR, NODE_IMPORTANCE, ACCENT } from '../../utils/constants'
import NodeConstellation from './NodeConstellation'
import CustomerCohort from './CustomerCohort'

const ICON_BY_TYPE = {
  [NODE_TYPES.SUPPLIER]: Truck,
  [NODE_TYPES.PRODUCT]: Package,
  [NODE_TYPES.BUNDLE]: Layers,
  [NODE_TYPES.REVENUE]: IndianRupee,
  [NODE_TYPES.SIGNAL]: Zap,
}

const RADIUS_BY_IMPORTANCE = {
  [NODE_IMPORTANCE.MINOR]: 18,
  [NODE_IMPORTANCE.STANDARD]: 22,
  [NODE_IMPORTANCE.MAJOR]: 26,
  [NODE_IMPORTANCE.HERO]: 30,
}

function hexagonPoints(r) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 90)
    return `${(r * 1.08 * Math.cos(angle)).toFixed(1)},${(r * 1.08 * Math.sin(angle)).toFixed(1)}`
  }).join(' ')
}

function octagonPoints(r) {
  return Array.from({ length: 8 }, (_, i) => {
    const angle = (Math.PI / 180) * (45 * i - 22.5)
    return `${(r * Math.cos(angle)).toFixed(1)},${(r * Math.sin(angle)).toFixed(1)}`
  }).join(' ')
}

function diamondPoints(r) {
  const s = r * 0.95
  return `0,${-s} ${s},0 0,${s} ${-s},0`
}

export default function BusinessNode({
  node,
  opacity = 1,
  isSelected,
  isHovered,
  onHover,
  onLeave,
  onClick,
  offsetX = 0,
  offsetY = 0,
  proximityScale = 1,
  reducedMotion = false,
  driftSeed = 0,
  isCascadeActive = false,
  justArrived = false,
  constellationPlacements = null,
  simState = null,
}) {
  const Icon = ICON_BY_TYPE[node.type]
  const isSignal = node.type === NODE_TYPES.SIGNAL
  const isSupplier = node.type === NODE_TYPES.SUPPLIER
  const isProduct = node.type === NODE_TYPES.PRODUCT
  const isBundle = node.type === NODE_TYPES.BUNDLE
  const isRevenue = node.type === NODE_TYPES.REVENUE
  const isCohort = node.type === NODE_TYPES.CUSTOMER_COHORT
  const r = isSignal ? 11 : RADIUS_BY_IMPORTANCE[node.importance] || 22
  const healthColor = simState?.color || HEALTH_COLOR[node.health]
  const ringColor = isSignal ? ACCENT.INTELLIGENCE : healthColor
  const selectionColor = ACCENT.LIME

  const isSimProtected = simState?.isProtected
  const isSimExposed = simState?.isExposed
  const isSimCritical = simState?.isCritical
  const emphasized = isSelected || isHovered || isCascadeActive || justArrived || isSimExposed || isSimProtected

  const bodyGlow =
    isSelected
      ? `drop-shadow(0 0 10px ${selectionColor}50)`
      : isSimCritical
      ? `drop-shadow(0 0 14px rgba(255, 92, 77, 0.85))`
      : isSimExposed
      ? `drop-shadow(0 0 10px rgba(255, 179, 71, 0.75))`
      : isSimProtected
      ? `drop-shadow(0 0 8px rgba(98, 201, 139, 0.6))`
      : justArrived || isCascadeActive
      ? `drop-shadow(0 0 8px ${healthColor}55)`
      : isHovered
      ? `drop-shadow(0 0 6px ${ringColor}40)`
      : 'none'

  const iconSize = isSignal ? 12 : 16
  const iconOff = iconSize / 2

  return (
    <g
      className="graph-node"
      transform={`translate(${node.x + offsetX}, ${node.y + offsetY}) scale(${proximityScale})`}
      opacity={opacity}
      style={{ transition: 'opacity 0.45s ease' }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={onLeave}
      onClick={() => onClick(node.id)}
    >
      <g
        className={reducedMotion ? '' : 'node-drift'}
        style={
          reducedMotion
            ? undefined
            : { '--drift-dur': `${11 + (driftSeed % 6)}s`, '--drift-delay': `${(driftSeed % 7) * -1.1}s` }
        }
      >
        {isSupplier && (
          <g
            className={`source-field ${!reducedMotion && node.id === 'supplier-a' ? 'source-pulse' : ''}`}
            opacity={emphasized ? 0.7 : 0.32}
          >
            {[-28, 0, 28].map((deg, i) => {
              const rad = (deg * Math.PI) / 180
              const x1 = Math.cos(rad) * (r + 2)
              const y1 = Math.sin(rad) * (r + 2)
              const x2 = Math.cos(rad) * (r + 12 + i)
              const y2 = Math.sin(rad) * (r + 12 + i)
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={healthColor}
                  strokeWidth={1.1}
                  strokeLinecap="round"
                  opacity={0.55}
                />
              )
            })}
          </g>
        )}

        {isRevenue && (
          <ellipse
            className={reducedMotion ? '' : 'revenue-field'}
            rx={r + 26}
            ry={r + 14}
            fill="none"
            stroke={healthColor}
            strokeWidth={0.55}
            opacity={emphasized ? 0.18 : 0.08}
          />
        )}

        {isSelected && (
          isProduct ? (
            <polygon points={hexagonPoints(r + 7)} fill="none" stroke={selectionColor} strokeWidth={1.6} opacity={0.9} />
          ) : isSignal ? (
            <polygon points={diamondPoints(r + 6)} fill="none" stroke={selectionColor} strokeWidth={1.4} opacity={0.9} />
          ) : isRevenue ? (
            <polygon points={octagonPoints(r + 7)} fill="none" stroke={selectionColor} strokeWidth={1.6} opacity={0.9} />
          ) : (
            <rect
              x={-(r + 6)}
              y={-(r + 6)}
              width={(r + 6) * 2}
              height={(r + 6) * 2}
              rx={isSupplier ? 5 : isBundle ? 14 : 8}
              fill="none"
              stroke={selectionColor}
              strokeWidth={1.6}
              opacity={0.9}
            />
          )
        )}

        {/* ---- Node body by economic role ---- */}
        {isCohort ? (
          <CustomerCohort r={r} healthColor={healthColor} isSelected={isSelected} ringColor={ringColor} reducedMotion={reducedMotion} />
        ) : isProduct ? (
          <polygon
            points={hexagonPoints(r)}
            className="graph-node-body"
            fill="url(#nodeGradient)"
            stroke={healthColor}
            strokeWidth={1.5}
            style={{ filter: bodyGlow }}
          />
        ) : isSignal ? (
          <g className="signal-mark">
            {!reducedMotion && (
              <g className="signal-traces" opacity={0.55}>
                {[-10, 0, 10].map((oy, i) => (
                  <line
                    key={i}
                    x1={r + 2}
                    y1={oy}
                    x2={r + 16 + i * 2}
                    y2={oy * 0.4}
                    stroke={ACCENT.INTELLIGENCE}
                    strokeWidth={0.9}
                    strokeLinecap="round"
                    opacity={0.5 - i * 0.08}
                  />
                ))}
              </g>
            )}
            <polygon
              points={diamondPoints(r)}
              className="graph-node-body"
              fill="url(#nodeGradient)"
              stroke={ACCENT.INTELLIGENCE}
              strokeWidth={1.3}
              style={{ filter: bodyGlow }}
            />
          </g>
        ) : isSupplier ? (
          <rect
            className="graph-node-body"
            x={-r * 0.78}
            y={-r * 0.78}
            width={r * 1.56}
            height={r * 1.56}
            rx={4}
            fill="url(#nodeGradient)"
            stroke={healthColor}
            strokeWidth={1.5}
            style={{ filter: bodyGlow }}
          />
        ) : isBundle ? (
          <g className="bundle-form" style={{ filter: bodyGlow }}>
            <circle cx={-7} cy={5} r={r * 0.62} fill="url(#nodeGradient)" stroke={healthColor} strokeWidth={1.2} opacity={0.85} />
            <circle cx={7} cy={5} r={r * 0.62} fill="url(#nodeGradient)" stroke={healthColor} strokeWidth={1.2} opacity={0.85} />
            <circle cx={0} cy={-7} r={r * 0.62} fill="url(#nodeGradient)" stroke={healthColor} strokeWidth={1.2} opacity={0.9} />
          </g>
        ) : isRevenue ? (
          <polygon
            points={octagonPoints(r)}
            className="graph-node-body"
            fill="url(#nodeGradient)"
            stroke={healthColor}
            strokeWidth={1.7}
            style={{ filter: bodyGlow }}
          />
        ) : (
          <rect
            className="graph-node-body"
            x={-r}
            y={-r}
            width={r * 2}
            height={r * 2}
            rx={6}
            fill="url(#nodeGradient)"
            stroke={healthColor}
            strokeWidth={1.5}
            style={{ filter: bodyGlow }}
          />
        )}

        {/* Protected buffer shield halo */}
        {isSimProtected && (
          <circle
            r={r + 5}
            fill="none"
            stroke="#62c98b"
            strokeWidth={1.4}
            strokeDasharray="4 3"
            opacity={0.8}
          />
        )}

        {/* Simulation status pill badge above node */}
        {simState?.statusLabel && (
          <g transform={`translate(0, ${-r - 14})`}>
            <rect
              x={-30}
              y={-7}
              width={60}
              height={14}
              rx={3}
              fill={isSimCritical ? 'rgba(255, 92, 77, 0.95)' : isSimProtected ? 'rgba(35, 134, 54, 0.95)' : 'rgba(210, 153, 34, 0.95)'}
              stroke={isSimCritical ? '#ff5c4d' : isSimProtected ? '#62c98b' : '#ffb347'}
              strokeWidth={0.8}
            />
            <text
              textAnchor="middle"
              y={3.5}
              fill="#ffffff"
              fontSize={7.5}
              fontWeight={700}
              letterSpacing="0.05em"
            >
              {simState.statusLabel}
            </text>
          </g>
        )}

        {(justArrived || ((isSimCritical || isSimExposed) && !reducedMotion)) && (
          <circle
            className="cascade-pulse-ring"
            r={r}
            fill="none"
            stroke={healthColor}
            strokeWidth={isSimCritical ? 2.2 : 1.6}
            style={{ '--pulse-r0': r }}
          />
        )}

        {!isCohort && (
          <circle cx={r - 5} cy={-r + 5} r={3.2} fill={healthColor} stroke="#181d1a" strokeWidth={1.2} />
        )}

        {Icon && !isCohort && (
          <g className="graph-node-icon-wrap" transform={`translate(${-iconOff}, ${-iconOff})`}>
            <Icon size={iconSize} color="#e8e6df" strokeWidth={1.8} />
          </g>
        )}
        {isCohort && (
          <g transform="translate(-6, -6)" opacity={0.8}>
            <Users size={12} color="#e8e6df" strokeWidth={1.8} />
          </g>
        )}

        <text className="node-label" textAnchor="middle" y={r + 18}>
          {node.label}
        </text>
        <text className="node-sublabel" textAnchor="middle" y={r + 30}>
          {node.sublabel}
        </text>
      </g>

      {isSelected && <NodeConstellation node={node} r={r} placements={constellationPlacements} />}
    </g>
  )
}
