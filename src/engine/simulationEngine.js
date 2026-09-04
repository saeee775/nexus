/**
 * PHASE 2.2 — Cascading Impact Simulation Engine
 *
 * Deterministic business intelligence engine that calculates cascading
 * consequences from disruptions across the business dependency graph.
 *
 * Traversal Flow:
 *   Supplier → Inventory → Product → Bundle → Customer Cohort → Revenue
 *   Signals (Razorpay) → Checkout Flow → Bundle / Revenue
 */

import { businessNodes, businessEdges, businessMetrics, cascadeRisk } from '../data/businessData.js'
import { mockPaymentSignals } from '../data/mockTransactions.js'
import {
  traverseDependencies,
  findDependencyPaths,
  edgeStrength,
  pathStrength,
} from './dependencyEngine.js'
import { computeRiskScore } from './riskEngine.js'
import { generateInterventions, recommendMinimumIntervention } from './interventionEngine.js'
import { hopsFromNodeIds } from '../utils/graphUtils.js'
import { NODE_TYPES, HEALTH } from '../utils/constants.js'

// ---------------------------------------------------------------------------
// Helpers & Revenue Baseline Extraction
// ---------------------------------------------------------------------------

function asArray(val) {
  return Array.isArray(val) ? val : []
}

/**
 * Parses Indian currency strings (e.g. '₹18.45L', '₹2L', '₹78.5K', '₹4,850')
 * into raw numerical INR values.
 */
export function parseCurrencyString(val) {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0
  if (typeof val !== 'string') return 0

  const clean = val.replace(/,/g, '').trim()
  const lakhMatch = clean.match(/([0-9.]+)\s*(?:L|Lakh)/i)
  if (lakhMatch) return Math.round(parseFloat(lakhMatch[1]) * 100000)

  const croreMatch = clean.match(/([0-9.]+)\s*(?:Cr|Crore)/i)
  if (croreMatch) return Math.round(parseFloat(croreMatch[1]) * 10000000)

  const kMatch = clean.match(/([0-9.]+)\s*K/i)
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000)

  const numMatch = clean.match(/([0-9.]+)/)
  if (numMatch) return Math.round(parseFloat(numMatch[1]))

  return 0
}

/**
 * Derives the baseline monthly business revenue.
 * Priority order:
 *  1. Active Revenue node in the business graph (metrics.monthly)
 *  2. Business executive summary metrics (revenue.value)
 *  3. Transaction run-rate (dailyVolume * avgTicketSize * 30 days)
 *  4. Fallback constant (₹18.45L = 1,845,000 INR) if no usable value exists.
 */
export function extractBaselineRevenue({ nodes = businessNodes, metrics = businessMetrics, transactions = mockPaymentSignals } = {}) {
  // 1. Direct from Revenue outcome node
  const revNode = asArray(nodes).find((n) => n.id === 'revenue' || n.type === NODE_TYPES.REVENUE)
  if (revNode?.metrics?.monthly) {
    const val = parseCurrencyString(revNode.metrics.monthly)
    if (val > 0) return val
  }

  // 2. Executive metrics
  if (metrics?.revenue?.value) {
    const val = parseCurrencyString(metrics.revenue.value)
    if (val > 0) return val
  }

  // 3. Transaction run-rate
  if (transactions?.dailyVolume && transactions?.avgTicketSize) {
    const runRate = transactions.dailyVolume * transactions.avgTicketSize * 30
    if (runRate > 0) return runRate
  }

  // 4. Documented fallback baseline (₹18.45L)
  return 1845000
}

/**
 * Formats a raw INR numeric value into an Indian Lakh / K display string.
 */
export function formatCurrencyINR(amount, { prefix = '₹', suffix = '' } = {}) {
  const n = Math.abs(amount)
  if (n >= 100000) {
    const inLakhs = n / 100000
    const formatted = inLakhs % 1 === 0 ? inLakhs.toString() : inLakhs.toFixed(inLakhs >= 10 ? 1 : 2).replace(/\.?0+$/, '')
    return `${prefix}${formatted}L${suffix}`
  }
  if (n >= 1000) {
    const inK = n / 1000
    const formatted = inK % 1 === 0 ? inK.toString() : inK.toFixed(1).replace(/\.?0+$/, '')
    return `${prefix}${formatted}K${suffix}`
  }
  return `${prefix}${Math.round(n).toLocaleString('en-IN')}${suffix}`
}

function verifyNodeExists(nodes, nodeId) {
  return asArray(nodes).some((n) => n.id === nodeId)
}

function getNode(nodes, nodeId) {
  return asArray(nodes).find((n) => n.id === nodeId) || null
}

// ---------------------------------------------------------------------------
// Event Normalization
// ---------------------------------------------------------------------------

function normalizeDisruption(input, nodes) {
  if (!input) return null

  // Input is already a structured event
  if (input.type && (input.nodeId || input.focusNodeId)) {
    return {
      type: input.type,
      nodeId: input.nodeId || input.focusNodeId,
      delayDays: input.delayDays ?? 10,
      unavailabilityPct: input.unavailabilityPct ?? 1,
      failureRateDelta: input.failureRateDelta ?? 0.15,
      shortageDays: input.shortageDays ?? 5,
      scenarioId: input.scenarioId || input.id || null,
      rawScenario: input,
    }
  }

  // Input is a scenario object with explicit `event` field
  if (input.event && input.event.type) {
    return {
      type: input.event.type,
      nodeId: input.event.nodeId || input.focusNodeId,
      delayDays: input.event.delayDays ?? 10,
      unavailabilityPct: input.event.unavailabilityPct ?? 1,
      failureRateDelta: input.event.failureRateDelta ?? 0.15,
      shortageDays: input.event.shortageDays ?? 5,
      scenarioId: input.id || null,
      rawScenario: input,
    }
  }

  // Infer event from scenario ID or focusNodeId
  const focusNodeId = input.focusNodeId || input.affectedNodeIds?.[0]
  const id = String(input.id || '').toLowerCase()
  const prompt = String(input.prompt || input.query || '').toLowerCase()

  if (id.includes('delay') || prompt.includes('delay')) {
    return {
      type: 'supplier_delay',
      nodeId: focusNodeId || 'supplier-a',
      delayDays: 10,
      scenarioId: input.id || null,
      rawScenario: input,
    }
  }

  if (id.includes('discontinued') || prompt.includes('discontinued') || id.includes('product') || prompt.includes('product')) {
    return {
      type: 'product_unavailable',
      nodeId: focusNodeId || 'product-x',
      unavailabilityPct: 1,
      scenarioId: input.id || null,
      rawScenario: input,
    }
  }

  if (id.includes('payment') || prompt.includes('payment') || id.includes('razorpay') || prompt.includes('success')) {
    return {
      type: 'payment_failure',
      nodeId: focusNodeId || 'razorpay-payments',
      failureRateDelta: 0.15,
      scenarioId: input.id || null,
      rawScenario: input,
    }
  }

  // Generic disruption
  return {
    type: 'disruption',
    nodeId: focusNodeId,
    scenarioId: input.id || null,
    rawScenario: input,
  }
}

// ---------------------------------------------------------------------------
// Simulation Calculation Engine
// ---------------------------------------------------------------------------

/**
 * Simulates the cascading consequences of a disruption or scenario
 * across the directed business dependency graph.
 *
 * @param {object} disruptionOrScenario Disruption event or scenario object
 * @param {object} [options]
 * @param {object[]} [options.nodes] Business graph nodes (defaults to businessNodes)
 * @param {object[]} [options.edges] Business graph edges (defaults to businessEdges)
 * @param {object} [options.metrics] Business metrics summary
 * @param {object} [options.transactions] Transaction signal signals
 * @returns {object} Structured simulation intelligence result
 */
export function runSimulation(disruptionOrScenario, options = {}) {
  const nodes = options.nodes || businessNodes
  const edges = options.edges || businessEdges
  const metrics = options.metrics || businessMetrics
  const transactions = options.transactions || mockPaymentSignals

  const baselineRevenue = extractBaselineRevenue({ nodes, metrics, transactions })
  const event = normalizeDisruption(disruptionOrScenario, nodes)

  if (!event || !event.nodeId || !verifyNodeExists(nodes, event.nodeId)) {
    return {
      success: false,
      scenarioId: disruptionOrScenario?.id || null,
      focusNodeId: event?.nodeId || null,
      affectedNodes: [],
      affectedNodeIds: [],
      propagationPaths: [],
      severity: { score: 0, level: 'low' },
      estimatedRevenueExposure: { amount: 0, formatted: '₹0', percent: 0, headline: 'No exposure detected' },
      affectedCustomerCohorts: [],
      explanation: { headline: 'No cascade detected', body: 'Target node is not found in the business ecosystem.', summary: 'No impact' },
      preview: { headline: 'No disruption simulated', body: 'No valid business node identified for simulation.', impact: '₹0 exposure', confidence: 'low' },
      cascadeRisk: { score: 0, max: 100, label: 'No vulnerability', steps: [] },
      hops: [],
    }
  }

  const startNode = getNode(nodes, event.nodeId)

  // 1. Graph Traversal: Directed downstream dependencies
  const traversal = traverseDependencies({
    nodeId: event.nodeId,
    nodes,
    edges,
    direction: 'downstream',
    maxHops: 6,
  })

  const downstreamDeps = traversal.dependencies

  // Collect unique affected node IDs in causal propagation order
  const affectedNodeIds = [event.nodeId]
  downstreamDeps.forEach((d) => {
    if (!affectedNodeIds.includes(d.nodeId)) {
      affectedNodeIds.push(d.nodeId)
    }
  })

  // 2. Identify Cohorts and Core Nodes
  const reachedCohorts = []
  const affectedNodeDetails = []

  // Detailed per-node impacts
  const nodeImpactMap = new Map()

  // Initialize start node
  nodeImpactMap.set(event.nodeId, {
    id: event.nodeId,
    label: startNode?.label || event.nodeId,
    type: startNode?.type || 'unknown',
    hops: 0,
    strength: 1,
    severity: 80,
    impactReason: `${event.type.replace('_', ' ')} initiated at source`,
    exposureClass: 'direct',
    path: [event.nodeId],
    edgeIds: [],
    hidden: false,
  })

  downstreamDeps.forEach((dep) => {
    const n = getNode(nodes, dep.nodeId)
    if (!n) return

    let nodeSeverity = Math.round(dep.strength * 100)
    let impactReason = `Downstream exposure (hop ${dep.hops})`
    let exposureClass = 'partially_exposed'
    let nodeDeficitDays = 0

    if (n.type === NODE_TYPES.PRODUCT) {
      if (typeof n.metrics?.stockDaysLeft === 'number') {
        if (event.type === 'supplier_delay') {
          const deficit = (event.delayDays || 10) - n.metrics.stockDaysLeft
          nodeDeficitDays = Math.max(0, deficit)
          if (deficit > 0) {
            exposureClass = deficit >= (event.delayDays || 10) * 0.5 ? 'fully_exposed' : 'partially_exposed'
            impactReason = `Stock cover (${n.metrics.stockDaysLeft}d) exhausted with ${deficit}d deficit`
            nodeSeverity = Math.min(100, Math.round(dep.strength * 85 + (deficit / (event.delayDays || 10)) * 25))
          } else {
            exposureClass = 'buffer-protected'
            impactReason = `Stock cover (${n.metrics.stockDaysLeft}d) absorbs ${event.delayDays || 10}d delay (protected)`
            nodeSeverity = Math.round(dep.strength * 15)
          }
        } else {
          exposureClass = 'fully_exposed'
          impactReason = `${n.metrics.stockDaysLeft} days stock cover compromised`
        }
      } else {
        exposureClass = 'partially_exposed'
        impactReason = `Product component impacted (downstream influence ${n.metrics?.downstreamInfluence || 0}%)`
      }
    } else if (n.type === NODE_TYPES.BUNDLE) {
      impactReason = `Bundle margin (${n.metrics?.margin || 0}%) at risk from component disruption`
      nodeSeverity = Math.min(100, Math.round(dep.strength * 95))
      exposureClass = 'partially_exposed'
    } else if (n.type === NODE_TYPES.CUSTOMER_COHORT) {
      impactReason = `${n.metrics?.revenueShare || 0}% revenue share cohort exposed (${n.metrics?.cohortSize || 0} customers)`
      exposureClass = 'partially_exposed'
      reachedCohorts.push({
        id: n.id,
        label: n.label,
        cohortSize: n.metrics?.cohortSize || 0,
        revenueShare: n.metrics?.revenueShare || 0,
        avgOrderValue: n.metrics?.avgOrderValue || '₹0',
        impactedMembers: Math.round((n.metrics?.cohortSize || 0) * (dep.strength * 0.7)),
        riskLevel: dep.strength > 0.6 ? 'critical' : 'warning',
      })
    } else if (n.type === NODE_TYPES.REVENUE) {
      impactReason = `Final economic revenue realization disrupted`
      exposureClass = 'partially_exposed'
    } else if (n.type === NODE_TYPES.SIGNAL) {
      impactReason = `Conversion & authorization friction on order confirmation`
      exposureClass = 'partially_exposed'
    }

    // Secondary check: if node depends on a buffer-protected product (e.g. addon-revenue depending on product-y)
    if (n.id === 'addon-revenue' && event.type === 'supplier_delay') {
      const prodY = nodeImpactMap.get('product-y')
      if (prodY && prodY.exposureClass === 'buffer-protected') {
        exposureClass = 'buffer-protected'
        impactReason = 'Protected by Product Y stock buffer (28d cover)'
      }
    }

    const detail = {
      id: n.id,
      label: n.label,
      type: n.type,
      hops: dep.hops,
      strength: dep.strength,
      severity: nodeSeverity,
      impactReason,
      exposureClass,
      deficitDays: nodeDeficitDays,
      path: dep.path,
      edgeIds: dep.edgeIds,
      hidden: dep.hidden,
      metrics: n.metrics || {},
    }

    nodeImpactMap.set(n.id, detail)
    affectedNodeDetails.push(detail)
  })

  // Collect unique affected node IDs in causal propagation order.
  // Buffer-protected nodes whose stock cover fully absorbs the disruption are not marked as exposed.
  const affectedNodeIds = [event.nodeId]
  downstreamDeps.forEach((d) => {
    const detail = nodeImpactMap.get(d.nodeId)
    if (detail && detail.exposureClass !== 'buffer-protected') {
      if (!affectedNodeIds.includes(d.nodeId)) {
        affectedNodeIds.push(d.nodeId)
      }
    }
  })

  // 3. Event-Specific Impact & Revenue Calculations
  let revenueExposureINR = 0
  let revenueExposurePercent = 0
  let headline = ''
  let body = ''
  let impactBadge = ''
  let confidence = 'high'
  let causalSteps = []

  if (event.type === 'supplier_delay') {
    // Supplier delay cascade
    const productX = getNode(nodes, 'product-x')
    const stockDays = productX?.metrics?.stockDaysLeft ?? 6
    const delayDays = event.delayDays || 10
    const deficitDays = Math.max(0, delayDays - stockDays)
    const vipCohort = getNode(nodes, 'vip-customers')
    const vipShare = vipCohort?.metrics?.revenueShare ?? 42
    const supplierLeadTime = parseInt(startNode.metrics?.leadTime) || 12

    // Cycle deficit ratio: proportion of restock cycle with stock deficit
    const cycleDeficitRatio = supplierLeadTime > 0 ? Math.min(1, deficitDays / supplierLeadTime) : 0
    const vipMonthlyRevenue = baselineRevenue * (vipShare / 100)
    const pathAttenuation = downstreamDeps.find((d) => d.nodeId === 'revenue')?.strength ?? 0.69
    const bundleVipEdge = edges.find((e) => e.source === 'premium-bundle' && e.target === 'vip-customers')
    const bundleConcentration = bundleVipEdge ? edgeStrength(bundleVipEdge) : 0.9

    revenueExposureINR = Math.round((vipMonthlyRevenue * cycleDeficitRatio * bundleConcentration * pathAttenuation) / 10000) * 10000
    revenueExposurePercent = Math.round((revenueExposureINR / baselineRevenue) * 1000) / 10

    headline = `${startNode.label} delay → cascading exposure`
    body = `A ${delayDays}-day delay drains Product X stock cover (${stockDays}d) resulting in a ${deficitDays}-day stockout deficit, disrupting Premium Bundle availability for the VIP cohort.`
    impactBadge = `${formatCurrencyINR(revenueExposureINR)} estimated revenue exposure`
    confidence = 'high'

    causalSteps = [
      { text: `${startNode.label} delayed by ${delayDays} days`, emphasis: false },
      { text: `Inventory cover exhausted (${stockDays}d cover vs ${delayDays}d delay: ${deficitDays}d deficit)`, emphasis: false },
      { text: 'Premium Bundle availability blocked', emphasis: false },
      { text: `VIP customer cohort exposure (${vipShare}% revenue share)`, emphasis: false },
      { text: `${formatCurrencyINR(revenueExposureINR)} estimated revenue exposure`, emphasis: true },
    ]
  } else if (event.type === 'product_unavailable') {
    // Product discontinuation / unavailable
    const downstreamShare = startNode.metrics?.downstreamInfluence ?? 31

    revenueExposurePercent = downstreamShare
    revenueExposureINR = Math.round((baselineRevenue * (downstreamShare / 100)) / 1000) * 1000

    headline = `${startNode.label} removal → bundle collapse risk`
    body = `Premium Bundle loses its core component. Without a substitute, VIP purchase rate for the bundle falls sharply.`
    impactBadge = `${revenueExposurePercent}% downstream revenue exposed`
    confidence = 'high'

    causalSteps = [
      { text: `${startNode.label} discontinued`, emphasis: false },
      { text: 'Premium Bundle loses core component', emphasis: false },
      { text: 'Addon & VIP purchase conversion halts', emphasis: false },
      { text: 'VIP customer cohort demand leakage', emphasis: false },
      { text: `${revenueExposurePercent}% downstream revenue exposed`, emphasis: true },
    ]
  } else if (event.type === 'payment_failure') {
    // Payment failure increase
    const dropPct = Math.round((event.failureRateDelta || 0.15) * 100)
    const failureDelta = event.failureRateDelta || 0.15
    const checkoutBundleEdge = edges.find((e) => e.source === 'checkout-flow' && e.target === 'premium-bundle')
    const checkoutStrength = checkoutBundleEdge ? edgeStrength(checkoutBundleEdge) : 0.48

    revenueExposureINR = Math.round((baselineRevenue * failureDelta * checkoutStrength) / 10000) * 10000
    revenueExposurePercent = Math.round((revenueExposureINR / baselineRevenue) * 1000) / 10

    headline = 'Payment friction → checkout leakage'
    body = `A ${dropPct}% drop in Razorpay payment success rate increases checkout abandonment on Premium Bundle purchases.`
    impactBadge = `~${formatCurrencyINR(revenueExposureINR)} estimated monthly leakage`
    confidence = 'medium'

    causalSteps = [
      { text: `Payment success drops ${dropPct}%`, emphasis: false },
      { text: 'Checkout flow authorization failures increase', emphasis: false },
      { text: 'High-ticket Premium Bundle cart abandonment', emphasis: false },
      { text: 'Economic transaction signal attenuation', emphasis: false },
      { text: `~${formatCurrencyINR(revenueExposureINR)} estimated monthly leakage`, emphasis: true },
    ]
  } else if (event.type === 'inventory_shortage') {
    // Inventory shortage
    revenueExposureINR = Math.round((baselineRevenue * 0.18) / 10000) * 10000
    revenueExposurePercent = 18

    headline = `${startNode.label} shortage → multi-product bottleneck`
    body = `A buffer depletion in ${startNode.label} cascades simultaneously into connected product lines, draining available stock.`
    impactBadge = `~${formatCurrencyINR(revenueExposureINR)} estimated revenue exposure`
    confidence = 'high'

    causalSteps = [
      { text: `${startNode.label} buffer depleted`, emphasis: false },
      { text: 'Downstream stock allocation constricted', emphasis: false },
      { text: 'Product stock cover exhausted', emphasis: false },
      { text: 'Downstream order fulfillment delay', emphasis: false },
      { text: `~${formatCurrencyINR(revenueExposureINR)} estimated revenue exposure`, emphasis: true },
    ]
  } else {
    // Generic fallback disruption on any other node
    const maxStrength = downstreamDeps.reduce((m, d) => Math.max(m, d.strength), 0)
    const reachCount = downstreamDeps.length
    revenueExposureINR = Math.round((baselineRevenue * (reachCount * 0.05) * maxStrength) / 10000) * 10000
    revenueExposurePercent = Math.round((revenueExposureINR / baselineRevenue) * 1000) / 10

    headline = `${startNode.label} disruption → cascading effect`
    body = `A disruption at ${startNode.label} propagates across ${reachCount} downstream business entities.`
    impactBadge = revenueExposureINR > 0 ? `${formatCurrencyINR(revenueExposureINR)} exposed` : `${reachCount} nodes impacted`
    confidence = 'medium'

    causalSteps = [
      { text: `Disruption at ${startNode.label}`, emphasis: false },
      ...downstreamDeps.slice(0, 3).map((d) => ({
        text: `Propagates to ${getNode(nodes, d.nodeId)?.label || d.nodeId}`,
        emphasis: false,
      })),
      { text: impactBadge, emphasis: true },
    ]
  }

  // 4. Dynamic Risk Scoring via computeRiskScore
  let criticalEdgeCount = 0
  let hiddenEdgeCount = 0
  downstreamDeps.forEach((d) => {
    if (d.edgeIds) {
      d.edgeIds.forEach((eid) => {
        const e = edges.find((edge) => edge.id === eid)
        if (e?.kind === 'critical') criticalEdgeCount += 1
        if (e?.hidden) hiddenEdgeCount += 1
      })
    }
  })

  const maxPathStrength = downstreamDeps.reduce((m, d) => Math.max(m, d.strength), 0)

  const { score: riskScore, label: riskLabel } = computeRiskScore({
    nodeId: event.nodeId,
    downstreamCount: affectedNodeIds.length - 1,
    maxStrength: maxPathStrength,
    revenueExposurePercent,
    criticalEdgeCount,
    hiddenEdgeCount,
    nodes,
    edges,
  })

  // 5. Animation Hops Generation
  // If the scenario already provided hand-timed hops, preserve them. Otherwise generate dynamically.
  let animationHops = event.rawScenario?.hops
  if (!animationHops || animationHops.length === 0) {
    animationHops = hopsFromNodeIds(edges, affectedNodeIds)
  }

  // 6. Propagation Paths
  const propagationPaths = downstreamDeps.map((dep) => ({
    targetNodeId: dep.nodeId,
    path: dep.path,
    edgeIds: dep.edgeIds,
    strength: dep.strength,
    hops: dep.hops,
    hidden: dep.hidden,
  }))

  const deficitDays = event.type === 'supplier_delay'
    ? Math.max(0, event.delayDays - (getNode(nodes, 'product-x')?.metrics?.stockDaysLeft ?? 6))
    : 0

  const { interventions, recommendation } = generateInterventions({
    eventType: event.type,
    focusNodeId: event.nodeId,
    baselineRevenue,
    revenueExposureINR,
    severityScore: riskScore,
    deficitDays,
    nodes,
    edges,
  })

  const baseline = {
    revenueExposure: 0,
    severity: Math.max(10, Math.round(riskScore * 0.2)),
    affectedNodeIds: [event.nodeId],
    timeToImpact: event.type === 'supplier_delay' ? 'Cover exhausted in 6 days' : event.type === 'payment_failure' ? 'Immediate on checkout' : 'Immediate upon SKU removal',
    currentCondition: event.type === 'supplier_delay' ? 'Product X: 6d stock cover | Supplier A lead time: 12d' : event.type === 'product_unavailable' ? 'Product X: 8% direct rev, 31% downstream influence' : 'Razorpay success rate: 99.2% | Volume: 386/day',
  }

  const disruption = {
    propagationPath: affectedNodeIds,
    affectedNodes: affectedNodeDetails,
    affectedCustomerCohorts: reachedCohorts,
    revenueAtRisk: revenueExposureINR,
    formattedRevenueAtRisk: formatCurrencyINR(revenueExposureINR),
    severityScore: riskScore,
    timeToImpact: event.type === 'supplier_delay' ? '6 days' : 'Immediate',
    singlePointOfFailure: event.type === 'product_unavailable' || event.type === 'supplier_delay',
  }

  return {
    success: true,
    scenarioId: event.scenarioId,
    focusNodeId: event.nodeId,
    baseline,
    disruption,
    affectedNodes: affectedNodeDetails,
    affectedNodeIds,
    propagationPaths,
    severity: {
      score: riskScore,
      level: riskScore >= 70 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
    },
    estimatedRevenueExposure: {
      amount: revenueExposureINR,
      formatted: formatCurrencyINR(revenueExposureINR),
      percent: revenueExposurePercent,
      headline: impactBadge,
    },
    affectedCustomerCohorts: reachedCohorts,
    explanation: {
      headline,
      body,
      summary: impactBadge,
    },
    preview: {
      headline,
      body,
      impact: impactBadge,
      confidence,
    },
    cascadeRisk: {
      score: riskScore,
      max: 100,
      label: riskLabel,
      steps: causalSteps,
    },
    interventions,
    recommendation,
    intervention: recommendation,
    hops: animationHops,
  }
}
