import { useMemo } from 'react'
import { findNodeById, getNeighborhood } from '../utils/graphUtils'

const MAX_SHIFT = 70
const SHIFT_LERP = 0.48
const EXPAND_PUSH = 38
const RECEDE_PUSH = 16
const FOCUS_SCALE = 1.22

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

/**
 * Focus mode: partial recenter + scale around the selected entity,
 * direct neighbors expand, unrelated nodes recede.
 */
export function useGraphFocus(nodes, edges, focusNodeId, viewW, viewH, reducedMotion = false) {
  return useMemo(() => {
    if (!focusNodeId) {
      return { groupOffset: { x: 0, y: 0 }, nodeOffsets: {}, focalNode: null, scale: 1 }
    }

    const focalNode = findNodeById(nodes, focusNodeId)
    if (!focalNode) {
      return { groupOffset: { x: 0, y: 0 }, nodeOffsets: {}, focalNode: null, scale: 1 }
    }

    const scale = reducedMotion ? 1 : FOCUS_SCALE
    const fullShiftX = viewW / 2 - focalNode.x
    const fullShiftY = viewH / 2 - focalNode.y
    const groupOffset = reducedMotion
      ? { x: 0, y: 0 }
      : {
          x: clamp(fullShiftX * SHIFT_LERP, -MAX_SHIFT, MAX_SHIFT),
          y: clamp(fullShiftY * SHIFT_LERP, -MAX_SHIFT, MAX_SHIFT),
        }

    const { nodeIds } = getNeighborhood(edges, focusNodeId)
    const nodeOffsets = {}

    nodes.forEach((n) => {
      if (n.id === focusNodeId) return
      const dx = n.x - focalNode.x
      const dy = n.y - focalNode.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const nx = dx / dist
      const ny = dy / dist
      const isNeighbor = nodeIds.has(n.id)
      const push = isNeighbor ? EXPAND_PUSH : RECEDE_PUSH
      nodeOffsets[n.id] = { x: nx * push, y: ny * push }
    })

    return { groupOffset, nodeOffsets, focalNode, scale }
  }, [nodes, edges, focusNodeId, viewW, viewH, reducedMotion])
}
