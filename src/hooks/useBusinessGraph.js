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
  const [activeSimulation, setActiveSimulation] = useState(null)
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
    if (scenarioHighlight || activeSimulation) return null
    if (!exploreId) return null
    return getNeighborhoodDegrees(edges, exploreId, 2)
  }, [exploreId, scenarioHighlight, activeSimulation, edges])

  // Derive per-node simulation visual state (healthy, protected, watch, exposed, critical, intelligence)
  const simulationNodeMap = useMemo(() => {
    if (!activeSimulation) return null
    const map = new Map()
    const affectedSet = new Set(activeSimulation.affectedNodeIds || [])
    const protectedSet = new Set(activeSimulation.bufferProtectedNodeIds || [])
    const focusId = activeSimulation.focusNodeId
    const deficitDays = activeSimulation.timeline?.deficitDays ?? 0
    const isBreached = activeSimulation.timeline?.isBreached ?? false

    nodes.forEach((n) => {
      // 1. Root disruption source node
      if (n.id === focusId) {
        map.set(n.id, {
          health: isBreached ? 'critical' : 'watch',
          color: isBreached ? '#ff5c4d' : '#ffb347',
          isExposed: true,
          isCritical: isBreached,
          isProtected: false,
          statusLabel: isBreached ? (deficitDays > 0 ? `${deficitDays}d DEFICIT` : 'DISRUPTION') : 'SHOCK START',
        })
        return
      }

      // 2. Buffer-protected nodes (Product X on days 0-6, Product Y and Add-on on all days)
      if (protectedSet.has(n.id)) {
        map.set(n.id, {
          health: 'healthy',
          color: '#62c98b',
          isExposed: false,
          isCritical: false,
          isProtected: true,
          statusLabel: 'PROTECTED',
        })
        return
      }

      // 3. Actively exposed downstream nodes (breached stockout buffer)
      if (affectedSet.has(n.id)) {
        const detail = activeSimulation.affectedNodes?.find((d) => d.id === n.id)
        const isCrit = (detail?.severity ?? 50) >= 65 || deficitDays >= 2
        map.set(n.id, {
          health: isCrit ? 'critical' : 'watch',
          color: isCrit ? '#ff5c4d' : '#ffb347',
          isExposed: true,
          isCritical: isCrit,
          isProtected: false,
          statusLabel: isCrit ? 'CRITICAL' : 'EXPOSED',
        })
        return
      }

      // 4. Default baseline node
      map.set(n.id, {
        health: n.health,
        color: null,
        isExposed: false,
        isCritical: false,
        isProtected: false,
        statusLabel: null,
      })
    })

    return map
  }, [activeSimulation, nodes])

  // Derive per-edge simulation visual state (active corridor flow, protected subdued, or idle)
  const simulationEdgeMap = useMemo(() => {
    if (!activeSimulation) return null
    const map = new Map()
    const affectedSet = new Set(activeSimulation.affectedNodeIds || [])
    const protectedSet = new Set(activeSimulation.bufferProtectedNodeIds || [])
    const deficitDays = activeSimulation.timeline?.deficitDays ?? 0

    edges.forEach((e) => {
      const isSourceExposed = affectedSet.has(e.source)
      const isTargetExposed = affectedSet.has(e.target)
      const isTargetProtected = protectedSet.has(e.target)

      // Active cascade corridor: both ends are actively exposed in current time slice
      if (isSourceExposed && isTargetExposed) {
        const isCritical = (activeSimulation.severity?.score ?? 50) >= 60 || deficitDays >= 2
        map.set(e.id, {
          isCorridorActive: true,
          isCritical,
          isProtected: false,
          color: isCritical ? 'var(--status-critical)' : 'var(--status-warning)',
          opacity: 1.0,
          strokeWidth: isCritical ? 3.4 : 2.5,
          flowSpeed: isCritical ? '1.5s' : '2.2s',
          courierSpeed: isCritical ? '1.8s' : '2.6s',
        })
        return
      }

      // Edge connecting to buffer-protected node (e.g. supplier-a -> product-x when buffered)
      if (isTargetProtected && (isSourceExposed || e.source === 'supplier-a' || e.source === 'shared-inventory' || e.source === 'product-x')) {
        map.set(e.id, {
          isCorridorActive: false,
          isCritical: false,
          isProtected: true,
          color: '#62c98b',
          opacity: 0.42,
          strokeWidth: 1.5,
        })
        return
      }

      // Unrelated edges stay subtly visible to keep the Digital Twin graph as the visual hero
      map.set(e.id, {
        isCorridorActive: false,
        isCritical: false,
        isProtected: false,
        color: '#5f6861',
        opacity: 0.18,
        strokeWidth: null,
      })
    })

    return map
  }, [activeSimulation, edges])

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

      // Active Shock Replay simulation has highest authority on graph visual presence
      if (activeSimulation) {
        if (activeSimulation.affectedNodeIds?.includes(nodeId)) return 1.0
        if (activeSimulation.bufferProtectedNodeIds?.includes(nodeId)) return 0.92
        return 0.48
      }

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
      activeSimulation,
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

      // Active Shock Replay simulation edge mapping
      if (activeSimulation && simulationEdgeMap) {
        const edgeState = simulationEdgeMap.get(edgeId)
        if (edgeState?.opacity !== undefined) return edgeState.opacity
      }

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
      activeSimulation,
      simulationEdgeMap,
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
      if (activeSimulation && simulationEdgeMap) {
        const edgeState = simulationEdgeMap.get(edgeId)
        if (edgeState?.isCorridorActive) return true
      }
      if (travelingEdgeId === edgeId || cascadeEdges.has(edgeId)) return true
      if (exploreDegrees) return (exploreDegrees.edgeDegree.get(edgeId) || 99) <= 1
      return false
    },
    [activeSimulation, simulationEdgeMap, exploreDegrees, travelingEdgeId, cascadeEdges]
  )

  const revealedHiddenEdgeIds = useMemo(() => {
    const ids = new Set()
    edges.forEach((e) => {
      if (!e.hidden) return
      if (cascadeEdges.has(e.id) || travelingEdgeId === e.id) ids.add(e.id)
      if (exploreDegrees?.edgeIds.has(e.id) && (exploreDegrees.edgeDegree.get(e.id) || 99) <= 2) {
        if (selectedNodeId || scenarioHighlight) ids.add(e.id)
      }
      if (activeSimulation?.affectedNodeIds?.includes(e.source) && activeSimulation?.affectedNodeIds?.includes(e.target)) {
        ids.add(e.id)
      }
    })
    return ids
  }, [edges, cascadeEdges, travelingEdgeId, exploreDegrees, selectedNodeId, scenarioHighlight, activeSimulation])

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId])

  const selectNode = useCallback((nodeId) => {
    setScenarioHighlight(null)
    setActiveSimulation(null)
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
    setActiveSimulation(null)
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

  const applyScenarioSimulation = useCallback((sim) => {
    setHighlightMode(null)
    setSelectedNodeId(null)
    setHoveredNodeId(null)
    setActiveSimulation(sim)
    if (sim) {
      setScenarioHighlight({
        nodeIds: sim.affectedNodeIds || [],
        focusNodeId: sim.focusNodeId,
        hops: sim.hops,
      })
    } else {
      setScenarioHighlight(null)
    }
  }, [])

  const clearScenarioHighlight = useCallback(() => {
    setScenarioHighlight(null)
    setActiveSimulation(null)
  }, [])

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
    applyScenarioSimulation,
    clearScenarioHighlight,
    scenarioHighlight,
    activeSimulation,
    simulationNodeMap,
    simulationEdgeMap,
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
