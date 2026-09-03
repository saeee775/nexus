/**
 * PHASE 2.1 — Dependency Analysis Engine
 *
 * Pure functions over the existing business graph
 * (`businessNodes` + `businessEdges`). Directed traversal only —
 * does not use the undirected UI neighborhood BFS.
 *
 * Edge direction convention (source → target):
 *   Supplier → Inventory → Product → Bundle → Cohort → Revenue
 *   Signal edges follow the same source → target flow.
 */

const DEFAULT_STRENGTH = 0.5
const DEFAULT_MAX_HOPS = 6

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function nodeExists(nodes, nodeId) {
  return asArray(nodes).some((n) => n.id === nodeId)
}

/** Interpretable strength: clamp edge.strength to [0,1], else DEFAULT_STRENGTH. */
export function edgeStrength(edge) {
  if (!edge) return 0
  const s = edge.strength
  if (typeof s !== 'number' || Number.isNaN(s)) return DEFAULT_STRENGTH
  return Math.max(0, Math.min(1, s))
}

/** Product of strengths along a path (interpretable attenuation). */
export function pathStrength(edgesAlongPath) {
  if (!edgesAlongPath.length) return 0
  return edgesAlongPath.reduce((acc, e) => acc * edgeStrength(e), 1)
}

function pathHasHidden(edgesAlongPath) {
  return edgesAlongPath.some((e) => Boolean(e.hidden))
}

function outgoingEdges(edges, nodeId) {
  return asArray(edges).filter((e) => e.source === nodeId && e.target && e.target !== nodeId)
}

function incomingEdges(edges, nodeId) {
  return asArray(edges).filter((e) => e.target === nodeId && e.source && e.source !== nodeId)
}

function edgeById(edges, id) {
  return asArray(edges).find((e) => e.id === id)
}

/**
 * DFS all simple directed paths from `startId` in `direction`.
 * Cycle-safe: nodes already on the current path are not revisited.
 */
function collectDirectedPaths(edges, startId, direction, maxHops) {
  const paths = []
  if (!startId || maxHops < 1) return paths

  function walk(currentId, nodeIds, edgeIds, edgeObjs) {
    if (nodeIds.length - 1 >= maxHops) return

    const nextEdges =
      direction === 'upstream' ? incomingEdges(edges, currentId) : outgoingEdges(edges, currentId)

    // Deterministic edge order
    const ordered = [...nextEdges].sort((a, b) => String(a.id).localeCompare(String(b.id)))

    for (const edge of ordered) {
      const nextId = direction === 'upstream' ? edge.source : edge.target
      if (!nextId || nodeIds.includes(nextId)) continue // cycle / self

      const nextNodes = [...nodeIds, nextId]
      const nextEdgeIds = [...edgeIds, edge.id]
      const nextEdgeObjs = [...edgeObjs, edge]

      paths.push({
        nodeIds: nextNodes,
        edgeIds: nextEdgeIds,
        strength: pathStrength(nextEdgeObjs),
        hidden: pathHasHidden(nextEdgeObjs),
        hops: nextNodes.length - 1,
        kind: edge.kind || 'standard',
        _edges: nextEdgeObjs,
      })

      walk(nextId, nextNodes, nextEdgeIds, nextEdgeObjs)
    }
  }

  walk(startId, [startId], [], [])
  return paths
}

function toPublicPath(path) {
  return {
    nodeIds: path.nodeIds,
    edgeIds: path.edgeIds,
    strength: round4(path.strength),
    hidden: path.hidden,
  }
}

function toDependencyRecord(path) {
  // Record describes the reached endpoint and the path from the origin.
  const endpoint = path.nodeIds[path.nodeIds.length - 1]
  return {
    nodeId: endpoint,
    path: path.nodeIds,
    hops: path.hops,
    strength: round4(path.strength),
    edgeIds: path.edgeIds,
    hidden: path.hidden,
    kind: path.kind,
  }
}

function round4(n) {
  return Math.round(n * 10000) / 10000
}

function round1(n) {
  return Math.round(n * 10) / 10
}

/**
 * For each reachable endpoint, keep the single best path:
 * highest strength → fewer hops → lexicographic edgeIds (deterministic).
 */
function bestPathPerEndpoint(paths) {
  const best = new Map()
  for (const path of paths) {
    const endpoint = path.nodeIds[path.nodeIds.length - 1]
    const prev = best.get(endpoint)
    if (!prev) {
      best.set(endpoint, path)
      continue
    }
    if (path.strength > prev.strength + 1e-12) {
      best.set(endpoint, path)
      continue
    }
    if (Math.abs(path.strength - prev.strength) <= 1e-12) {
      if (path.hops < prev.hops) {
        best.set(endpoint, path)
        continue
      }
      if (path.hops === prev.hops) {
        const a = path.edgeIds.join('|')
        const b = prev.edgeIds.join('|')
        if (a < b) best.set(endpoint, path)
      }
    }
  }
  return best
}

function emptyTraverse(nodeId, direction, maxHops) {
  return {
    nodeId,
    direction,
    maxHops,
    dependencies: [],
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Directed traversal from a node.
 *
 * @param {{ nodeId: string, nodes: object[], edges: object[], direction?: 'downstream'|'upstream', maxHops?: number }} args
 * @returns {{ nodeId, direction, maxHops, dependencies: DependencyRecord[] }}
 */
export function traverseDependencies({
  nodeId,
  nodes,
  edges,
  direction = 'downstream',
  maxHops = DEFAULT_MAX_HOPS,
} = {}) {
  const dir = direction === 'upstream' ? 'upstream' : 'downstream'
  const hops = Math.max(0, Math.floor(maxHops ?? DEFAULT_MAX_HOPS))

  if (!nodeId || !nodeExists(nodes, nodeId)) {
    return emptyTraverse(nodeId ?? null, dir, hops)
  }

  const paths = collectDirectedPaths(asArray(edges), nodeId, dir, hops)
  const best = bestPathPerEndpoint(paths)
  const dependencies = [...best.values()]
    .map(toDependencyRecord)
    .sort((a, b) => a.hops - b.hops || b.strength - a.strength || a.nodeId.localeCompare(b.nodeId))

  return {
    nodeId,
    direction: dir,
    maxHops: hops,
    dependencies,
  }
}

/**
 * All simple directed paths from sourceId → targetId (downstream only).
 *
 * @returns {{ sourceId, targetId, maxHops, paths: PathResult[] }}
 */
export function findDependencyPaths({
  sourceId,
  targetId,
  nodes,
  edges,
  maxHops = DEFAULT_MAX_HOPS,
} = {}) {
  const hops = Math.max(0, Math.floor(maxHops ?? DEFAULT_MAX_HOPS))
  const empty = { sourceId: sourceId ?? null, targetId: targetId ?? null, maxHops: hops, paths: [] }

  if (!sourceId || !targetId) return empty
  if (!nodeExists(nodes, sourceId) || !nodeExists(nodes, targetId)) return empty
  if (sourceId === targetId) return empty

  const all = collectDirectedPaths(asArray(edges), sourceId, 'downstream', hops)
  const matching = all
    .filter((p) => p.nodeIds[p.nodeIds.length - 1] === targetId)
    .map(toPublicPath)
    .sort((a, b) => b.strength - a.strength || a.nodeIds.length - b.nodeIds.length || a.edgeIds.join('|').localeCompare(b.edgeIds.join('|')))

  // Deduplicate identical edge sequences (should already be unique from DFS)
  const seen = new Set()
  const paths = []
  for (const p of matching) {
    const key = p.edgeIds.join('>')
    if (seen.has(key)) continue
    seen.add(key)
    paths.push(p)
  }

  return { sourceId, targetId, maxHops: hops, paths }
}

/**
 * Hidden dependency paths involving a node (downstream and upstream),
 * i.e. any directed path that includes at least one `hidden: true` edge.
 *
 * @returns {{ nodeId, maxHops, paths: Array<PathResult & { direction }> }}
 */
export function findHiddenDependencies({
  nodeId,
  nodes,
  edges,
  maxHops = DEFAULT_MAX_HOPS,
} = {}) {
  const hops = Math.max(0, Math.floor(maxHops ?? DEFAULT_MAX_HOPS))
  if (!nodeId || !nodeExists(nodes, nodeId)) {
    return { nodeId: nodeId ?? null, maxHops: hops, paths: [] }
  }

  const down = collectDirectedPaths(asArray(edges), nodeId, 'downstream', hops)
  const up = collectDirectedPaths(asArray(edges), nodeId, 'upstream', hops)

  const paths = []
  const seen = new Set()

  for (const path of down) {
    if (!path.hidden) continue
    const key = `down:${path.edgeIds.join('>')}`
    if (seen.has(key)) continue
    seen.add(key)
    paths.push({ ...toPublicPath(path), direction: 'downstream', hops: path.hops })
  }
  for (const path of up) {
    if (!path.hidden) continue
    const key = `up:${path.edgeIds.join('>')}`
    if (seen.has(key)) continue
    seen.add(key)
    paths.push({ ...toPublicPath(path), direction: 'upstream', hops: path.hops })
  }

  paths.sort(
    (a, b) =>
      a.direction.localeCompare(b.direction) ||
      a.hops - b.hops ||
      b.strength - a.strength ||
      a.edgeIds.join('|').localeCompare(b.edgeIds.join('|'))
  )

  return { nodeId, maxHops: hops, paths }
}

/**
 * Downstream nodes grouped by hop, with best weighted influence per node.
 *
 * @returns {{ nodeId, maxHops, hop1: DependencyRecord[], hop2: ..., influences: Record<string, number> }}
 */
export function calculateDownstreamExposure({
  nodeId,
  nodes,
  edges,
  maxHops = DEFAULT_MAX_HOPS,
} = {}) {
  const hops = Math.max(0, Math.floor(maxHops ?? DEFAULT_MAX_HOPS))
  const result = {
    nodeId: nodeId ?? null,
    maxHops: hops,
    influences: {},
  }

  for (let h = 1; h <= hops; h++) {
    result[`hop${h}`] = []
  }

  if (!nodeId || !nodeExists(nodes, nodeId) || hops < 1) {
    return result
  }

  const traversal = traverseDependencies({
    nodeId,
    nodes,
    edges,
    direction: 'downstream',
    maxHops: hops,
  })

  for (const dep of traversal.dependencies) {
    const key = `hop${dep.hops}`
    if (!result[key]) result[key] = []
    result[key].push(dep)
    result.influences[dep.nodeId] = dep.strength
  }

  return result
}

/**
 * Interpretable 0–100 criticality for a node.
 *
 * Factors (capped contributions, sum → clamp 0–100):
 *  - Reach:        up to 35  — unique downstream nodes
 *  - Strength:     up to 25  — strongest path influence among downstream
 *  - Critical:     up to 20  — critical edges on best downstream paths
 *  - Hidden:       up to 15  — hidden edges involved downstream
 *  - Proximity:    up to 5   — direct (hop-1) fan-out
 */
export function calculateDependencyCriticality({ nodeId, nodes, edges } = {}) {
  const empty = {
    nodeId: nodeId ?? null,
    criticality: 0,
    factors: {
      reach: 0,
      strength: 0,
      criticalEdges: 0,
      hidden: 0,
      proximity: 0,
    },
  }

  if (!nodeId || !nodeExists(nodes, nodeId)) return empty

  const traversal = traverseDependencies({
    nodeId,
    nodes,
    edges,
    direction: 'downstream',
    maxHops: DEFAULT_MAX_HOPS,
  })

  const deps = traversal.dependencies
  const reachCount = deps.length
  const maxStrength = deps.reduce((m, d) => Math.max(m, d.strength), 0)
  const hop1Count = deps.filter((d) => d.hops === 1).length

  const edgeIds = new Set()
  deps.forEach((d) => d.edgeIds.forEach((id) => edgeIds.add(id)))

  let criticalEdgeCount = 0
  let hiddenEdgeCount = 0
  edgeIds.forEach((id) => {
    const e = edgeById(edges, id)
    if (!e) return
    if (e.kind === 'critical') criticalEdgeCount += 1
    if (e.hidden) hiddenEdgeCount += 1
  })

  const factors = {
    reach: Math.min(35, reachCount * 3.5),
    strength: Math.min(25, maxStrength * 25),
    criticalEdges: Math.min(20, criticalEdgeCount * 5),
    hidden: Math.min(15, hiddenEdgeCount * 5),
    proximity: Math.min(5, hop1Count * 1.25),
  }

  const criticality = Math.max(
    0,
    Math.min(100, round1(factors.reach + factors.strength + factors.criticalEdges + factors.hidden + factors.proximity))
  )

  return {
    nodeId,
    criticality,
    factors: {
      reach: round1(factors.reach),
      strength: round1(factors.strength),
      criticalEdges: round1(factors.criticalEdges),
      hidden: round1(factors.hidden),
      proximity: round1(factors.proximity),
    },
    downstreamCount: reachCount,
    maxPathStrength: round4(maxStrength),
  }
}

/**
 * Convenience aggregate for simulationEngine / UI adapters.
 * Consistent combined shape — does not replace the focused APIs above.
 */
export function analyzeDependencies({
  nodeId,
  nodes,
  edges,
  maxHops = DEFAULT_MAX_HOPS,
} = {}) {
  const hops = Math.max(0, Math.floor(maxHops ?? DEFAULT_MAX_HOPS))

  if (!nodeId || !nodeExists(nodes, nodeId)) {
    return {
      nodeId: nodeId ?? null,
      upstream: [],
      downstream: [],
      hiddenDependencies: [],
      criticality: 0,
    }
  }

  const upstream = traverseDependencies({
    nodeId,
    nodes,
    edges,
    direction: 'upstream',
    maxHops: hops,
  }).dependencies

  const downstream = traverseDependencies({
    nodeId,
    nodes,
    edges,
    direction: 'downstream',
    maxHops: hops,
  }).dependencies

  const hiddenDependencies = findHiddenDependencies({
    nodeId,
    nodes,
    edges,
    maxHops: hops,
  }).paths

  const { criticality } = calculateDependencyCriticality({ nodeId, nodes, edges })

  return {
    nodeId,
    upstream,
    downstream,
    hiddenDependencies,
    criticality,
  }
}
