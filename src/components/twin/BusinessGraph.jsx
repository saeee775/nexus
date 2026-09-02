import { useEffect, useMemo, useRef } from 'react'
import { GitCommit } from 'lucide-react'
import BusinessNode from './BusinessNode'
import DependencyEdge from './DependencyEdge'
import GraphControls from './GraphControls'
import GraphBreadcrumb from './GraphBreadcrumb'
import GraphTerritory from './GraphTerritory'
import GraphInsightOverlay from './GraphInsightOverlay'
import { constellationItems } from './NodeConstellation'
import { findNodeById, getNeighborhood, getNeighborhoodDegrees } from '../../utils/graphUtils'
import { placeAnnotations } from '../../utils/placeAnnotations'
import { useCursorProximity } from '../../hooks/useCursorProximity'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useGraphFocus } from '../../hooks/useGraphFocus'
import { businessMetrics, clusters, VIEW_W, VIEW_H, GRAPH_SAFE } from '../../data/businessData'
import { NODE_IMPORTANCE } from '../../utils/constants'

const HOVER_PUSH = 10
const PROX_OFFSET = 6

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

export default function BusinessGraph({ graph }) {
  const {
    nodes,
    edges,
    hoveredNodeId,
    setHoveredNodeId,
    selectedNode,
    selectedNodeId,
    selectNode,
    clearSelection,
    highlightMode,
    toggleHighlightMode,
    isEdgeHighlighted,
    resetView,
    signalFilterActive,
    toggleSignalFilter,
    cascadeActiveNodeIds,
    cascadeActiveEdgeIds,
    getNodeOpacity,
    getEdgeOpacity,
    travelingEdgeId,
    travelingDur,
    justArrivedId,
    setProximityAnchorId,
    revealedHiddenEdgeIds,
    scenarioHighlight,
  } = graph

  const svgRef = useRef(null)
  const reducedMotion = useReducedMotion()

  const proximityEnabled = !reducedMotion && !selectedNode && !scenarioHighlight
  const { cursor, nearestId } = useCursorProximity(svgRef, nodes, { enabled: proximityEnabled })

  useEffect(() => {
    setProximityAnchorId(proximityEnabled ? nearestId : null)
  }, [nearestId, proximityEnabled, setProximityAnchorId])

  const proxNeighborhood = useMemo(() => {
    if (!nearestId || !proximityEnabled) return null
    return getNeighborhoodDegrees(edges, nearestId, 2)
  }, [nearestId, proximityEnabled, edges])

  const proximityOffsets = useMemo(() => {
    const map = {}
    if (!cursor || !nearestId || !proxNeighborhood) return map
    proxNeighborhood.nodeIds.forEach((id) => {
      const n = findNodeById(nodes, id)
      if (!n) return
      const dx = n.x - cursor.x
      const dy = n.y - cursor.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const hop = proxNeighborhood.degree.get(id) ?? 2
      const falloff = Math.max(0, 1 - dist / 210)
      const boost = hop === 0 ? 1 : hop === 1 ? 0.5 : 0.2
      map[id] = {
        offsetX: (dx / dist) * falloff * falloff * PROX_OFFSET * boost,
        offsetY: (dy / dist) * falloff * falloff * PROX_OFFSET * boost,
        scale: 1 + falloff * falloff * 0.03 * boost,
      }
    })
    return map
  }, [cursor, nearestId, proxNeighborhood, nodes])

  const hoveredPush = useMemo(() => {
    const map = {}
    if (!hoveredNodeId || hoveredNodeId === selectedNodeId) return map
    const hoveredNode = findNodeById(nodes, hoveredNodeId)
    if (!hoveredNode) return map
    const { nodeIds } = getNeighborhood(edges, hoveredNodeId)
    nodeIds.forEach((id) => {
      if (id === hoveredNodeId) return
      const n = findNodeById(nodes, id)
      if (!n) return
      const dx = n.x - hoveredNode.x
      const dy = n.y - hoveredNode.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      map[id] = { x: (dx / dist) * HOVER_PUSH, y: (dy / dist) * HOVER_PUSH }
    })
    return map
  }, [hoveredNodeId, selectedNodeId, nodes, edges])

  const { groupOffset, nodeOffsets, focalNode, scale } = useGraphFocus(
    nodes,
    edges,
    selectedNodeId,
    VIEW_W,
    VIEW_H,
    reducedMotion
  )

  const directionAnchorId = hoveredNodeId || selectedNodeId
  const edgeDirection = useMemo(() => {
    const map = {}
    if (!directionAnchorId) return map
    edges.forEach((e) => {
      if (e.target === directionAnchorId) map[e.id] = 'in'
      else if (e.source === directionAnchorId) map[e.id] = 'out'
    })
    return map
  }, [directionAnchorId, edges])

  const insightAnchor = useMemo(() => {
    if (!focalNode || selectedNode) return null
    return {
      x: clamp(focalNode.x + groupOffset.x, 190, VIEW_W - 190),
      y: clamp(focalNode.y + groupOffset.y + 118, 70, VIEW_H - 56),
    }
  }, [focalNode, groupOffset, selectedNode])

  const insightLines = useMemo(() => {
    if (!selectedNode) return []
    return [selectedNode.insight].filter(Boolean).slice(0, 1)
  }, [selectedNode])

  const constellationByNode = useMemo(() => {
    if (!selectedNode) return null
    const origin = {
      x: selectedNode.x + (nodeOffsets[selectedNode.id]?.x || 0),
      y: selectedNode.y + (nodeOffsets[selectedNode.id]?.y || 0),
    }
    const obstacles = nodes.map((n) => {
      const ox = nodeOffsets[n.id]?.x || 0
      const oy = nodeOffsets[n.id]?.y || 0
      const major =
        n.importance === NODE_IMPORTANCE.HERO || n.importance === NODE_IMPORTANCE.MAJOR || n.id === selectedNode.id
      const size = n.id === selectedNode.id ? 86 : 52
      return {
        x: n.x + ox - size / 2,
        y: n.y + oy - size / 2,
        w: size,
        h: size + 28,
        priority: major ? 100 : 40,
        pad: n.id === selectedNode.id ? 14 : 8,
      }
    })
    const bounds = {
      x: GRAPH_SAFE.x - groupOffset.x,
      y: GRAPH_SAFE.y - groupOffset.y,
      w: GRAPH_SAFE.w,
      h: GRAPH_SAFE.h,
    }
    return placeAnnotations({
      origin,
      items: constellationItems(selectedNode),
      obstacles,
      bounds,
    })
  }, [selectedNode, nodes, nodeOffsets, groupOffset])

  const crumbs = selectedNode ? ['Ecosystem', selectedNode.label] : null

  const originX = focalNode ? focalNode.x : VIEW_W / 2
  const originY = focalNode ? focalNode.y : VIEW_H / 2
  const focusTransition = reducedMotion ? 'none' : 'transform 0.72s cubic-bezier(0.16, 1, 0.3, 1)'

  return (
    <section className="panel twin-panel">
      <div className="panel-header">
        <span className="panel-title">
          <GitCommit size={13} />
          Business Digital Twin
        </span>
        <div className="twin-header-meta">
          <span className="signal-caption" style={{ margin: 0 }}>
            {selectedNode ? 'Investigating dependency universe' : 'Supply → Product → Demand → Revenue'}
          </span>
          <span className="twin-meta-divider" />
          <span className="twin-meta-stat">{businessMetrics.monitoredEntities} entities</span>
          <span className="twin-meta-stat" style={{ color: 'var(--status-healthy)' }}>
            {businessMetrics.ecosystemHealth}% health
          </span>
        </div>
      </div>

      <div className="twin-canvas-wrap">
        <GraphControls
          highlightMode={highlightMode}
          onToggleDependencies={() => toggleHighlightMode('dependencies')}
          onToggleRisk={() => toggleHighlightMode('risk')}
          signalFilterActive={signalFilterActive}
          onToggleFilter={toggleSignalFilter}
          onReset={resetView}
        />

        <GraphBreadcrumb crumbs={crumbs} onBack={clearSelection} />

        <svg
          ref={svgRef}
          className="twin-svg"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="nodeGradient" cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#232a24" />
              <stop offset="100%" stopColor="#181d1a" />
            </radialGradient>
            <filter id="grainFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise" />
              <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.91  0 0 0 0 0.90  0 0 0 0 0.87  0 0 0 0.05 0" />
            </filter>
            {focalNode && (
              <radialGradient
                id="focusVignette"
                cx="0"
                cy="0"
                r="1"
                gradientUnits="userSpaceOnUse"
                gradientTransform={`translate(${focalNode.x + groupOffset.x} ${focalNode.y + groupOffset.y}) scale(380)`}
              >
                <stop offset="0%" stopColor="#0b0d0c" stopOpacity="0" />
                <stop offset="58%" stopColor="#0b0d0c" stopOpacity="0" />
                <stop offset="100%" stopColor="#0b0d0c" stopOpacity="0.5" />
              </radialGradient>
            )}
          </defs>

          {/* BACKGROUND — atmospheric territories */}
          <g className="layer-background">
            {clusters.map((c) => (
              <GraphTerritory key={c.id} cluster={c} faded={Boolean(selectedNode) || Boolean(scenarioHighlight)} />
            ))}
          </g>

          <g
            className="layer-ecosystem"
            style={{
              transformOrigin: `${originX}px ${originY}px`,
              transform: `translate(${groupOffset.x}px, ${groupOffset.y}px) scale(${scale})`,
              transition: focusTransition,
            }}
          >
            <g className="layer-flows">
              {edges.map((edge, i) => {
                const sourceNode = findNodeById(nodes, edge.source)
                const targetNode = findNodeById(nodes, edge.target)
                if (!sourceNode || !targetNode) return null
                const sOff = nodeOffsets[sourceNode.id] || { x: 0, y: 0 }
                const tOff = nodeOffsets[targetNode.id] || { x: 0, y: 0 }
                const shiftedSource = { x: sourceNode.x + sOff.x, y: sourceNode.y + sOff.y }
                const shiftedTarget = { x: targetNode.x + tOff.x, y: targetNode.y + tOff.y }
                return (
                  <DependencyEdge
                    key={edge.id}
                    edge={edge}
                    sourceNode={shiftedSource}
                    targetNode={shiftedTarget}
                    opacity={getEdgeOpacity(edge.id, edge)}
                    isHighlighted={isEdgeHighlighted(edge.id)}
                    isCascadeActive={cascadeActiveEdgeIds.has(edge.id)}
                    isTraveling={travelingEdgeId === edge.id}
                    travelDur={travelingDur}
                    focusDirection={edgeDirection[edge.id]}
                    particleSeed={i}
                    reducedMotion={reducedMotion}
                    hiddenRevealed={revealedHiddenEdgeIds.has(edge.id)}
                  />
                )
              })}
            </g>

            <g className="layer-nodes">
              {nodes.map((node, i) => {
                const push = hoveredPush[node.id]
                const prox = proximityOffsets[node.id]
                const focus = nodeOffsets[node.id]
                const offsetX = (push?.x || 0) + (prox?.offsetX || 0) + (focus?.x || 0)
                const offsetY = (push?.y || 0) + (prox?.offsetY || 0) + (focus?.y || 0)
                return (
                  <BusinessNode
                    key={node.id}
                    node={node}
                    opacity={getNodeOpacity(node.id)}
                    isSelected={selectedNode?.id === node.id}
                    isHovered={hoveredNodeId === node.id}
                    onHover={setHoveredNodeId}
                    onLeave={() => setHoveredNodeId(null)}
                    onClick={selectNode}
                    offsetX={offsetX}
                    offsetY={offsetY}
                    proximityScale={prox?.scale || 1}
                    reducedMotion={reducedMotion}
                    driftSeed={i}
                    isCascadeActive={cascadeActiveNodeIds.has(node.id)}
                    justArrived={justArrivedId === node.id}
                    constellationPlacements={selectedNode?.id === node.id ? constellationByNode : null}
                  />
                )
              })}
            </g>
          </g>

          {focalNode && (
            <rect
              x="-100"
              y="-100"
              width={VIEW_W + 200}
              height={VIEW_H + 200}
              fill="url(#focusVignette)"
              pointerEvents="none"
            />
          )}
          {insightAnchor && insightLines.length > 0 && !selectedNode && (
            <GraphInsightOverlay x={insightAnchor.x} y={insightAnchor.y} lines={insightLines} />
          )}

          <rect x="0" y="0" width={VIEW_W} height={VIEW_H} filter="url(#grainFilter)" pointerEvents="none" />
        </svg>

        <div className="twin-legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#62c98b' }} /> Healthy
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#ffb347' }} /> Watch
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#ff5c4d' }} /> Critical
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#8b7cff' }} /> NEXUS Intelligence
          </span>
        </div>
      </div>
    </section>
  )
}
