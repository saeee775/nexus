/**
 * PHASE 2 — Risk Scoring Engine
 *
 * Computes a 0–100 cascade risk score for a node or simulation scenario,
 * based on dependency depth, revenue exposure, and signal volatility.
 */

import { cascadeRisk, businessNodes, businessEdges } from '../data/businessData.js'
import { calculateDependencyCriticality } from './dependencyEngine.js'

/**
 * Computes a deterministic 0–100 cascade risk score for a given node or scenario.
 *
 * @param {object} params
 * @param {string} [params.nodeId] Focus node identifier
 * @param {number} [params.downstreamCount] Number of reachable downstream nodes
 * @param {number} [params.maxStrength] Maximum path strength along downstream paths
 * @param {number} [params.revenueExposurePercent] Percent of revenue exposed
 * @param {number} [params.criticalEdgeCount] Critical edges in propagation paths
 * @param {number} [params.hiddenEdgeCount] Hidden edges in propagation paths
 * @param {object[]} [params.nodes]
 * @param {object[]} [params.edges]
 * @returns {{ score: number, max: number, label: string, factors: object }}
 */
export function computeRiskScore({
  nodeId,
  downstreamCount = 0,
  maxStrength = 1,
  revenueExposurePercent = 0,
  criticalEdgeCount = 0,
  hiddenEdgeCount = 0,
  nodes = businessNodes,
  edges = businessEdges,
} = {}) {
  // Base criticality from dependency graph structure (0–100)
  const criticality = nodeId
    ? calculateDependencyCriticality({ nodeId, nodes, edges }).criticality
    : cascadeRisk.score

  // Revenue exposure factor (up to 35 pts)
  const revenueFactor = Math.min(35, (revenueExposurePercent / 100) * 80)

  // Reach factor (up to 30 pts)
  const reachFactor = Math.min(30, downstreamCount * 5)

  // Critical/hidden edge factor (up to 20 pts)
  const edgeFactor = Math.min(20, criticalEdgeCount * 5 + hiddenEdgeCount * 4)

  // Path strength attenuation factor (up to 15 pts)
  const strengthFactor = Math.min(15, maxStrength * 15)

  const rawScore = Math.round(
    criticality * 0.35 + revenueFactor + reachFactor * 0.4 + edgeFactor * 0.5 + strengthFactor
  )

  const score = Math.max(10, Math.min(95, rawScore))

  let label = 'Moderate vulnerability'
  if (score >= 70) {
    label = 'Critical vulnerability — single point of failure'
  } else if (score >= 60) {
    label = 'High vulnerability — stockout imminent'
  } else if (score >= 40) {
    label = 'Moderate vulnerability — conversion leakage'
  } else {
    label = 'Low vulnerability — buffered ecosystem'
  }

  return {
    score,
    max: 100,
    label,
    factors: {
      criticality,
      revenueFactor: Math.round(revenueFactor),
      reachFactor: Math.round(reachFactor),
      edgeFactor: Math.round(edgeFactor),
      strengthFactor: Math.round(strengthFactor),
    },
  }
}
