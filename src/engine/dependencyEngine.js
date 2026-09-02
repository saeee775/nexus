// PHASE 2 — Dependency Graph Traversal Engine
//
// Not implemented in Phase 1. This file exists to reserve the module
// boundary so Phase 1 UI components can import a stable interface later
// without restructuring. Nothing here pretends to compute real traversal.

/**
 * Will compute the full upstream/downstream dependency chain for a node,
 * including multi-hop weighted influence (e.g. Product X's 31% downstream
 * revenue influence). Intentionally unimplemented in Phase 1.
 */
export function traverseDependencies() {
  throw new Error('dependencyEngine.traverseDependencies is implemented in Phase 2.')
}
