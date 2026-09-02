import { useMemo, useState, useCallback, useEffect } from 'react'
import { businessNodes, businessEdges } from '../data/businessData'
import {
  getNeighborhoodDegrees,
  neighborhoodOpacity,
  hopsFromNodeIds,
} from '../utils/graphUtils'
import { HEALTH, NODE_IMPORTANCE, NODE_TYPES } from '../utils/constants'

const IDLE_OPACITY = {
  [NODE_IMPORTANCE.HERO]: 1,
  [NODE_IMPORTANCE.MAJOR]: 0.96,
  [NODE_IMPORTANCE.STANDARD]: 0.78,
  [NODE_IMPORTANCE.MINOR]: 0.48,
}

/**
 * Owns all interaction state for the Business Digital Twin graph.
 */
export function useBusinessGraph() {
  const [hoveredNodeId, setHoveredNodeId] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [highlightMode, setHighlightMode] = useState(null)
  const [scenarioHighlight, setScenarioHighlight] = useState(null)
  const [signalFilterActive, setSignalFilterActive] = useState(false)
  const [cascadeNodes, setCascadeNodes] = useState(() => new Set())
  const [cascadeEdges, setCascadeEdges] = useState(() => new Set())
  const [travelingEdgeId, setTravelingEdgeId] = useState(null)
  const [travelingDur, setTravelingDur] = useState(0.5)
  const [justArrivedId, setJustArrivedId] = useState(null)
  const [proximityAnchorId, setProximityAnchorId] = useState(null)

  const nodes = businessNodes
  const edges = businessEdges

  const exploreId = hoveredNodeId || selectedNodeId || proximityAnchorId

  const exploreDegrees = useMemo(() => {
    if (scenarioHighlight) return null
    if (!exploreId) return null
    return getNeighborhoodDegrees(edges, exploreId, 2)
  }, [exploreId, scenarioHighlight, edges])

  useEffect(() => {
    if (!scenarioHighlight) {
      setCascadeNodes(new Set())
      setCascadeEdges(new Set())
      setTravelingEdgeId(null)
      setJustArrivedId(null)
      return
    }
    const hops =
      scenarioHighlight.hops?.length > 0
        ? scenarioHighlight.hops
        : hopsFromNodeIds(edges, scenarioHighlight.nodeIds)

    setCascadeNodes(new Set())
    setCascadeEdges(new Set())
    setTravelingEdgeId(null)
    setJustArrivedId(null)

    const timers = hops.map((h) =>
      setTimeout(() => {
        if (h.travel && h.edgeId) {
          setTravelingEdgeId(h.edgeId)
          setTravelingDur((h.dur || 500) / 1000)
        }
        if (h.nodeId) {
          setCascadeNodes((prev) => new Set(prev).add(h.nodeId))
          setJustArrivedId(h.nodeId)
          setTimeout(() => {
            setJustArrivedId((curr) => (curr === h.nodeId ? null : curr))
          }, 900)
        }
        if (h.edgeId && !h.travel) {
          setCascadeEdges((prev) => new Set(prev).add(h.edgeId))
          setTravelingEdgeId((curr) => (curr === h.edgeId ? null : curr))
        }
      }, h.t)
    )

    return () => timers.forEach(clearTimeout)
  }, [scenarioHighlight, edges])

  const cascadeActiveNodeIds = cascadeNodes
  const cascadeActiveEdgeIds = cascadeEdges

  const cascadeInProgress =
    Boolean(scenarioHighlight) && cascadeNodes.size < (scenarioHighlight?.nodeIds.length ?? 0)

  const riskNodeIds = useMemo(
    () => new Set(nodes.filter((n) => n.health !== HEALTH.HEALTHY).map((n) => n.id)),
    [nodes]
  )

  const criticalEdgeIds = useMemo(() => new Set(edges.filter((e) => e.kind === 'critical').map((e) => e.id)), [edges])
  const criticalNodeIds = useMemo(() => {
    const ids = new Set()
    edges.forEach((e) => {
      if (e.kind === 'critical') {
        ids.add(e.source)
        ids.add(e.target)
      }
    })
    return ids
  }, [edges])

  const signalNodeIds = useMemo(() => new Set(nodes.filter((n) => n.type === NODE_TYPES.SIGNAL).map((n) => n.id)), [nodes])
  const signalEdgeIds = useMemo(() => new Set(edges.filter((e) => e.kind === 'signal').map((e) => e.id)), [edges])

  const getNodeOpacity = useCallback(
    (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId)
      if (signalFilterActive && signalNodeIds.has(nodeId)) return 0.12

      if (highlightMode === 'risk') return riskNodeIds.has(nodeId) ? 1 : 0.22
      if (highlightMode === 'dependencies') return criticalNodeIds.has(nodeId) ? 1 : 0.22

      if (scenarioHighlight) {
        if (cascadeNodes.has(nodeId)) return 1
        if (scenarioHighlight.nodeIds.includes(nodeId)) return 0.45
        return 0.22
      }

      if (exploreDegrees) {
        return neighborhoodOpacity(exploreDegrees.degree.get(nodeId))
      }

      return IDLE_OPACITY[node?.importance] ?? 0.7
    },
    [
      nodes,
      signalFilterActive,
      signalNodeIds,
      highlightMode,
      riskNodeIds,
      criticalNodeIds,
      scenarioHighlight,
      cascadeNodes,
      exploreDegrees,
    ]
  )

  const getEdgeOpacity = useCallback(
    (edgeId, edge) => {
      if (signalFilterActive && signalEdgeIds.has(edgeId)) return 0.04
      if (highlightMode === 'risk') {
        const hot = riskNodeIds.has(edge.source) && riskNodeIds.has(edge.target)
        return hot || edge.kind === 'critical' ? 0.7 : 0.08
      }
      if (highlightMode === 'dependencies') return criticalEdgeIds.has(edgeId) ? 0.8 : 0.08

      if (scenarioHighlight) {
        if (travelingEdgeId === edgeId || cascadeEdges.has(edgeId)) return 0.95
        if (scenarioHighlight.nodeIds.includes(edge.source) && scenarioHighlight.nodeIds.includes(edge.target)) {
          return 0.2
        }
        return 0.06
      }

      if (exploreDegrees) {
        const d = exploreDegrees.edgeDegree.get(edgeId)
        if (d === 1) return 0.9
        if (d === 2) return 0.55
        return 0.08
      }

      if (edge.hidden) return 0.04
      if (edge.kind === 'critical') return 0.42
      if (edge.kind === 'signal') return 0.35
      return 0.18
    },
    [
      signalFilterActive,
      signalEdgeIds,
      highlightMode,
      riskNodeIds,
      criticalEdgeIds,
      scenarioHighlight,
      travelingEdgeId,
      cascadeEdges,
      exploreDegrees,
    ]
  )

  const isNodeDimmed = useCallback((nodeId) => getNodeOpacity(nodeId) < 0.4, [getNodeOpacity])

  const isEdgeDimmed = useCallback(
    (edgeId, edge) => getEdgeOpacity(edgeId, edge) < 0.12,
    [getEdgeOpacity]
  )

  const isEdgeHighlighted = useCallback(
    (edgeId) => {
      if (travelingEdgeId === edgeId || cascadeEdges.has(edgeId)) return true
      if (exploreDegrees) return (exploreDegrees.edgeDegree.get(edgeId) || 99) <= 1
      return false
    },
    [exploreDegrees, travelingEdgeId, cascadeEdges]
  )

  const revealedHiddenEdgeIds = useMemo(() => {
    const ids = new Set()
    edges.forEach((e) => {
      if (!e.hidden) return
      if (cascadeEdges.has(e.id) || travelingEdgeId === e.id) ids.add(e.id)
      if (exploreDegrees?.edgeIds.has(e.id) && (exploreDegrees.edgeDegree.get(e.id) || 99) <= 2) {
        if (selectedNodeId || scenarioHighlight) ids.add(e.id)
      }
    })
    return ids
  }, [edges, cascadeEdges, travelingEdgeId, exploreDegrees, selectedNodeId, scenarioHighlight])

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId])

  const selectNode = useCallback((nodeId) => {
    setScenarioHighlight(null)
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId))
  }, [])

  const clearSelection = useCallback(() => setSelectedNodeId(null), [])

  const toggleHighlightMode = useCallback((mode) => {
    setHighlightMode((prev) => (prev === mode ? null : mode))
  }, [])

  const resetView = useCallback(() => {
    setSelectedNodeId(null)
    setHighlightMode(null)
    setHoveredNodeId(null)
    setScenarioHighlight(null)
    setSignalFilterActive(false)
    setProximityAnchorId(null)
  }, [])

  const toggleSignalFilter = useCallback(() => setSignalFilterActive((v) => !v), [])

  const applyScenarioHighlight = useCallback((nodeIds, focusNodeId, hops) => {
    setHighlightMode(null)
    setSelectedNodeId(null)
    setHoveredNodeId(null)
    setScenarioHighlight({ nodeIds, focusNodeId, hops })
  }, [])

  const clearScenarioHighlight = useCallback(() => setScenarioHighlight(null), [])

  return {
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
    isNodeDimmed,
    isEdgeDimmed,
    isEdgeHighlighted,
    getNodeOpacity,
    getEdgeOpacity,
    resetView,
    applyScenarioHighlight,
    clearScenarioHighlight,
    scenarioHighlight,
    signalFilterActive,
    toggleSignalFilter,
    cascadeActiveNodeIds,
    cascadeActiveEdgeIds,
    cascadeInProgress,
    travelingEdgeId,
    travelingDur,
    justArrivedId,
    proximityAnchorId,
    setProximityAnchorId,
    exploreDegrees,
    revealedHiddenEdgeIds,
  }
}
