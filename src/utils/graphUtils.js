/** Returns edge ids directly touching a node (either direction). */
export function getDirectEdges(edges, nodeId) {
  return edges.filter((e) => e.source === nodeId || e.target === nodeId)
}

/** Returns node ids immediately upstream (feeding into) a node. */
export function getUpstreamNodeIds(edges, nodeId) {
  return edges.filter((e) => e.target === nodeId).map((e) => e.source)
}

/** Returns node ids immediately downstream (fed by) a node. */
export function getDownstreamNodeIds(edges, nodeId) {
  return edges.filter((e) => e.source === nodeId).map((e) => e.target)
}

/**
 * 1-hop neighborhood: the node itself, immediate neighbors, connecting edges.
 * Kept for focus-expansion (direct neighbors only).
 */
export function getNeighborhood(edges, nodeId) {
  const nodeIds = new Set([nodeId])
  const edgeIds = new Set()

  edges.forEach((e) => {
    if (e.source === nodeId || e.target === nodeId) {
      edgeIds.add(e.id)
      nodeIds.add(e.source)
      nodeIds.add(e.target)
    }
  })

  return { nodeIds, edgeIds }
}

/**
 * BFS hop distances from `nodeId` up to `maxHop`.
 * degree 0 = self, 1 = direct, 2 = second-degree.
 */
export function getNeighborhoodDegrees(edges, nodeId, maxHop = 2) {
  const degree = new Map([[nodeId, 0]])
  const edgeDegree = new Map()
  let frontier = [nodeId]

  for (let hop = 1; hop <= maxHop; hop++) {
    const next = []
    frontier.forEach((id) => {
      edges.forEach((e) => {
        let other = null
        if (e.source === id) other = e.target
        else if (e.target === id) other = e.source
        if (!other) return
        if (!degree.has(other)) {
          degree.set(other, hop)
          next.push(other)
        }
      })
    })
    frontier = next
  }

  edges.forEach((e) => {
    const ds = degree.get(e.source)
    const dt = degree.get(e.target)
    if (ds === undefined || dt === undefined) return
    edgeDegree.set(e.id, Math.max(ds, dt))
  })

  const nodeIds = new Set(degree.keys())
  const edgeIds = new Set(edgeDegree.keys())
  return { degree, edgeDegree, nodeIds, edgeIds }
}

export function neighborhoodOpacity(degree, { direct = 1, second = 0.7, rest = 0.25 } = {}) {
  if (degree === 0 || degree === 1) return direct
  if (degree === 2) return second
  return rest
}

/**
 * Given an ordered list of node ids representing a path, returns edge ids
 * connecting consecutive nodes, if such edges exist.
 */
export function getPathEdgeIds(edges, orderedNodeIds) {
  const edgeIds = new Set()
  for (let i = 0; i < orderedNodeIds.length - 1; i++) {
    const from = orderedNodeIds[i]
    const to = orderedNodeIds[i + 1]
    const match = edges.find(
      (e) => (e.source === from && e.target === to) || (e.source === to && e.target === from)
    )
    if (match) edgeIds.add(match.id)
  }
  return edgeIds
}

export function findNodeById(nodes, id) {
  return nodes.find((n) => n.id === id)
}

export function hopsFromNodeIds(edges, nodeIds, stepMs = 500) {
  const hops = []
  nodeIds.forEach((id, i) => {
    const t = i * stepMs
    if (i > 0) {
      const from = nodeIds[i - 1]
      const match = edges.find(
        (e) => (e.source === from && e.target === id) || (e.source === id && e.target === from)
      )
      if (match) hops.push({ t: Math.max(0, t - 400), edgeId: match.id, travel: true, dur: 400 })
      hops.push({ t, nodeId: id, edgeId: match?.id })
    } else {
      hops.push({ t: 0, nodeId: id })
    }
  })
  return hops
}
