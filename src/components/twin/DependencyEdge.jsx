import { useMemo } from 'react'
import { ACCENT } from '../../utils/constants'

const EDGE_COLOR = {
  critical: ACCENT.LIME,
  backup: '#5f6861',
  standard: '#6a736c',
  signal: ACCENT.INTELLIGENCE,
}

function hashSign(id) {
  let sum = 0
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i)
  return sum % 2 === 0 ? 1 : -1
}

function hashUnit(id, salt = 1) {
  let sum = salt * 17
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i) * (i + 1)
  return (sum % 100) / 100
}

/** Organic cubic spline with a slight S-bow so branches merge rather than fan. */
export function buildCurve(source, target, edgeId) {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  const sign = hashSign(edgeId)
  const bow = Math.min(78, dist * (0.16 + hashUnit(edgeId) * 0.1)) * sign
  const nx = -dy / dist
  const ny = dx / dist
  const c1x = source.x + dx * 0.32 + nx * bow
  const c1y = source.y + dy * 0.32 + ny * bow
  const c2x = source.x + dx * 0.68 + nx * bow * 0.28
  const c2y = source.y + dy * 0.68 + ny * bow * 0.28
  return {
    d: `M ${source.x} ${source.y} C ${c1x} ${c1y} ${c2x} ${c2y} ${target.x} ${target.y}`,
    midX: (c1x + c2x) / 2,
    midY: (c1y + c2y) / 2,
  }
}

export default function DependencyEdge({
  edge,
  sourceNode,
  targetNode,
  opacity = 0.3,
  isHighlighted,
  particleSeed,
  reducedMotion = false,
  isCascadeActive = false,
  isTraveling = false,
  travelDur = 0.5,
  focusDirection,
  hiddenRevealed = false,
  simEdgeState = null,
}) {
  const curve = useMemo(() => buildCurve(sourceNode, targetNode, edge.id), [sourceNode, targetNode, edge.id])
  const baseColor = EDGE_COLOR[edge.kind] || EDGE_COLOR.standard
  const isDashed = edge.kind === 'backup'
  const pathId = `path-${edge.id}`
  const isHiddenEdge = Boolean(edge.hidden)
  const strength = edge.strength ?? 0.4
  const restingWidth = 0.7 + strength * 2.1

  const isCorridorActive = Boolean(simEdgeState?.isCorridorActive || isCascadeActive || isTraveling)
  const isCriticalCorridor = Boolean(simEdgeState?.isCritical)

  let color = baseColor
  if (simEdgeState?.color) color = simEdgeState.color
  else if (isCascadeActive || isTraveling) color = 'var(--status-critical)'
  else if (isHiddenEdge && hiddenRevealed) color = ACCENT.INTELLIGENCE
  else if (!isHiddenEdge && isHighlighted && focusDirection === 'in') color = 'var(--status-warning)'
  else if (!isHiddenEdge && isHighlighted && focusDirection === 'out') color = ACCENT.LIME

  const showIdleParticle =
    !reducedMotion &&
    !isHiddenEdge &&
    !isTraveling &&
    !isCorridorActive &&
    (edge.kind === 'critical' || edge.kind === 'signal') &&
    opacity > 0.15

  const strokeW = simEdgeState?.strokeWidth || (isTraveling || isCascadeActive ? restingWidth + 1.1 : isHighlighted ? restingWidth + 0.4 : restingWidth)

  return (
    <g className="dep-edge-group" opacity={opacity} style={{ transition: 'opacity 0.45s ease' }}>
      <path
        id={pathId}
        className={`dep-edge ${isHiddenEdge ? 'hidden-dep' : ''} ${hiddenRevealed ? 'hidden-revealed' : ''}`}
        d={curve.d}
        stroke={color}
        fill="none"
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={isDashed ? '4 6' : hiddenRevealed ? undefined : isHiddenEdge ? '3 10' : undefined}
        style={{
          transition: 'stroke 0.35s ease, stroke-width 0.35s ease',
        }}
      />

      {/* Animated streaming dash flow along the active corridor path */}
      {isCorridorActive && (
        <path
          d={curve.d}
          stroke={color}
          fill="none"
          strokeWidth={strokeW + 0.6}
          strokeDasharray={isCriticalCorridor ? '8 6' : '5 7'}
          strokeLinecap="round"
          opacity={0.9}
        >
          <animate
            attributeName="stroke-dashoffset"
            from={isCriticalCorridor ? '28' : '24'}
            to="0"
            dur={simEdgeState?.flowSpeed || (isCriticalCorridor ? '0.7s' : '1.3s')}
            repeatCount="indefinite"
          />
        </path>
      )}

      {/* Active traveling courier particle along the corridor */}
      {isCorridorActive && !reducedMotion && (
        <circle r={isCriticalCorridor ? 3.4 : 2.5} fill={color} opacity={0.95} className="cascade-courier">
          <animateMotion
            dur={simEdgeState?.courierSpeed || (isCriticalCorridor ? '1.0s' : '1.7s')}
            repeatCount="indefinite"
            keyPoints="0;1"
            keyTimes="0;1"
          >
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      )}

      {showIdleParticle && particleSeed % 2 === 0 && (
        <circle r={1.7} fill={color} className="flow-particle" opacity={0.7}>
          <animateMotion dur={`${5.2 + (particleSeed % 4) * 0.7}s`} repeatCount="indefinite" begin={`${(particleSeed % 5) * 1.1}s`}>
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      )}

      {isTraveling && !reducedMotion && !isCorridorActive && (
        <circle r={4} fill={color} className="cascade-courier">
          <animateMotion dur={`${Math.max(0.35, travelDur)}s`} fill="freeze" keyPoints="0;1" keyTimes="0;1">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      )}

      {hiddenRevealed && (isHighlighted || isTraveling || isCascadeActive) && (
        <text x={curve.midX} y={curve.midY - 8} textAnchor="middle" className="hidden-dep-label">
          HIDDEN DEPENDENCY
        </text>
      )}
    </g>
  )
}
