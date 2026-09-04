/**
 * PHASE 3 — Decision-Grade Minimum Intervention Engine
 *
 * Counterfactual simulation of realistic business interventions.
 * Derives protection rates deterministically from business graph attributes:
 *  - Supplier failover: lead times and buffer recovery
 *  - Component substitution: stock availability and margin retention
 *  - Payment recovery: authorization rates and ticket volumes
 *
 * Scored using normalized dimensionless terms:
 *   protectionRatio = revenueProtected / revenueExposure
 *   residualRiskRatio = residualSeverity / 100
 *   score = 0.8 * protectionRatio - 0.2 * residualRiskRatio
 */

import { formatCurrencyINR } from './simulationEngine.js'

/**
 * Generates 2–3 realistic counterfactual interventions for a disruption event
 * and algorithmically selects the optimal business action.
 *
 * @param {object} params
 * @param {string} params.eventType Disruption type (e.g. 'supplier_delay', 'product_unavailable', 'payment_failure')
 * @param {string} params.focusNodeId Source node of the disruption
 * @param {number} [params.baselineRevenue] Baseline monthly revenue in INR
 * @param {number} [params.revenueExposureINR] Revenue currently exposed in INR
 * @param {number} [params.severityScore] Current cascade severity (0–100)
 * @param {number} [params.deficitDays] Days of stock deficit (if applicable)
 * @param {object[]} [params.nodes] Business graph nodes
 * @param {object[]} [params.edges] Business graph edges
 * @returns {{ interventions: object[], recommendation: object }}
 */
export function generateInterventions({
  eventType,
  focusNodeId,
  baselineRevenue = 1845000,
  revenueExposureINR = 0,
  severityScore = 50,
  deficitDays = 0,
  nodes = [],
  edges = [],
} = {}) {
  let options = []

  const supplierBNode = nodes.find((n) => n.id === 'supplier-b')
  const supplierANode = nodes.find((n) => n.id === 'supplier-a')
  const productXNode = nodes.find((n) => n.id === 'product-x')
  const productYNode = nodes.find((n) => n.id === 'product-y')
  const bundleNode = nodes.find((n) => n.id === 'premium-bundle')
  const sharedInvNode = nodes.find((n) => n.id === 'shared-inventory')
  const vipNode = nodes.find((n) => n.id === 'vip-customers')
  const paymentNode = nodes.find((n) => n.id === 'razorpay-payments')

  if (eventType === 'supplier_delay' || focusNodeId === 'supplier-a') {
    // 1. Supplier B Failover:
    // Lead times: Supplier B has 19 days, Supplier A has 12 days.
    // Supplier B reliability is 94% (vs Supplier A 81%).
    const suppBLeadTime = parseInt(supplierBNode?.metrics?.leadTime) || 19
    const suppALeadTime = parseInt(supplierANode?.metrics?.leadTime) || 12
    const suppBReliability = (supplierBNode?.metrics?.reliability || 94) / 100
    const leadTimeDiff = suppBLeadTime - suppALeadTime // +7 days
    const expeditedLeadTimePenalty = 0.12 // scenario assumption: 12% residual transit variance
    const supplierBProtectionRatio = Math.min(0.95, Math.max(0.4, suppBReliability * (1 - expeditedLeadTimePenalty)))

    const suppBProtected = Math.round(revenueExposureINR * supplierBProtectionRatio)
    const suppBExposureAfter = revenueExposureINR - suppBProtected
    const suppBResidualSev = Math.max(12, Math.round(severityScore * (1 - supplierBProtectionRatio * 0.85)))

    // 2. Reallocate Shared Inventory Buffer:
    // Shared inventory has 9 days cover. Deficit is deficitDays.
    const sharedCover = sharedInvNode?.metrics?.stockDaysLeft || 9
    const bufferCoverageRatio = deficitDays > 0 ? Math.min(1, sharedCover / (deficitDays + 3)) : 1
    const sharedEdgeToY = edges.find((e) => e.source === 'shared-inventory' && e.target === 'product-y')
    const strainFactor = sharedEdgeToY?.strength || 0.45
    const sharedProtectionRatio = Math.min(0.9, Math.max(0.3, bufferCoverageRatio * (1 - strainFactor * 0.6)))

    const sharedProtected = Math.round(revenueExposureINR * sharedProtectionRatio)
    const sharedExposureAfter = revenueExposureINR - sharedProtected
    const sharedResidualSev = Math.max(18, Math.round(severityScore * (1 - sharedProtectionRatio * 0.75)))

    // 3. Ration Stock for VIP Customer Cohort:
    // VIP cohort share: 42%, Repeat cohort share: 19%.
    const vipShare = vipNode?.metrics?.revenueShare || 42
    const repeatNode = nodes.find((n) => n.id === 'repeat-customers')
    const repeatShare = repeatNode?.metrics?.revenueShare || 19
    const vipProtectionRatio = (vipShare / (vipShare + repeatShare)) * 0.80 // scenario assumption: 20% non-VIP churn risk

    const vipProtected = Math.round(revenueExposureINR * vipProtectionRatio)
    const vipExposureAfter = revenueExposureINR - vipProtected
    const vipResidualSev = Math.max(22, Math.round(severityScore * (1 - vipProtectionRatio * 0.65)))

    options = [
      {
        id: 'expedite-supplier-b',
        name: 'Expedite Supplier B (Backup)',
        description: `Re-route restock to Supplier B (${suppBLeadTime}d lead time expedited) to cover ${deficitDays}d stockout deficit.`,
        tradeoff: `+${leadTimeDiff}d standard lead time compressed with freight surcharge; unit cost +8%`,
        revenueExposureAfter: suppBExposureAfter,
        revenueProtected: suppBProtected,
        residualSeverity: suppBResidualSev,
        effectiveness: supplierBProtectionRatio > 0.75 ? 'prevents' : 'reduces',
        assumptions: [
          `Supplier B reliability (${supplierBNode?.metrics?.reliability || 94}%) utilized as secondary source`,
          `Lead time delta (+${leadTimeDiff}d) compressed via expedited transit (12% residual variance assumption)`,
        ],
      },
      {
        id: 'draw-shared-inventory',
        name: 'Reallocate Shared Inventory Buffer',
        description: `Dedicate Shared Inventory buffer (${sharedCover}d cover) exclusively to Product X assembly.`,
        tradeoff: 'Depletes shared safety pool; reduces Product Y cover from 28d to 19d',
        revenueExposureAfter: sharedExposureAfter,
        revenueProtected: sharedProtected,
        residualSeverity: sharedResidualSev,
        effectiveness: 'reduces',
        assumptions: [
          `Shared inventory pool has ${sharedCover}d cover vs ${deficitDays}d deficit`,
          `Draw creates secondary strain on Product Y branch (edge strength ${strainFactor})`,
        ],
      },
      {
        id: 'ration-vip-priority',
        name: 'Ration Stock for VIP Customer Cohort',
        description: `Allocate remaining stock exclusively to VIP cohort (${vipShare}% revenue share), deferring repeat cohort orders.`,
        tradeoff: `Order deferral for non-VIP customer segment (${repeatShare}% revenue share)`,
        revenueExposureAfter: vipExposureAfter,
        revenueProtected: vipProtected,
        residualSeverity: vipResidualSev,
        effectiveness: 'reduces',
        assumptions: [
          `VIP cohort represents ${vipShare}% of revenue vs Repeat cohort ${repeatShare}%`,
          'Scenario assumption: 20% churn risk on deferred non-VIP orders',
        ],
      },
    ]
  } else if (eventType === 'product_unavailable' || focusNodeId === 'product-x') {
    // 1. Substitute Product Y into Bundle Core Slot:
    // Margin retention: Product Y margin ~34% vs Bundle margin 46% (from bundleNode.metrics.margin)
    const bundleMargin = bundleNode?.metrics?.margin || 46
    const substituteMargin = 34 // scenario assumption: reconfigured bundle margin
    const marginRetentionRatio = Math.min(1, substituteMargin / bundleMargin) // 34 / 46 = 73.9%
    const subProtected = Math.round(revenueExposureINR * marginRetentionRatio)
    const subExposureAfter = revenueExposureINR - subProtected
    const subResidualSev = Math.max(18, Math.round(severityScore * (1 - marginRetentionRatio * 0.75)))

    // 2. Unbundle to Standalone Product Y + Add-ons:
    const unbundleRetentionRatio = ((productYNode?.metrics?.directRevenue || 11) + (productYNode?.metrics?.downstreamInfluence || 14)) / (productXNode?.metrics?.downstreamInfluence || 31)
    const cappedUnbundleRatio = Math.min(0.7, Math.max(0.3, unbundleRetentionRatio || 0.455))
    const unbundleProtected = Math.round(revenueExposureINR * cappedUnbundleRatio)
    const unbundleExposureAfter = revenueExposureINR - unbundleProtected
    const unbundleResidualSev = Math.max(25, Math.round(severityScore * (1 - cappedUnbundleRatio * 0.6)))

    // 3. Emergency Retooling with Secondary SKU Vendor:
    const retoolingLeadTime = 21 // scenario assumption: 21d tooling qualification
    const firstMonthProtectionRatio = Math.max(0.1, (30 - retoolingLeadTime) / 30) // ~30%
    const retoolProtected = Math.round(revenueExposureINR * firstMonthProtectionRatio)
    const retoolExposureAfter = revenueExposureINR - retoolProtected
    const retoolResidualSev = Math.max(30, Math.round(severityScore * (1 - firstMonthProtectionRatio * 0.5)))

    options = [
      {
        id: 'substitute-bundle-core',
        name: 'Substitute Product Y into Bundle Core Slot',
        description: `Reconfigure Premium Bundle recipe with Product Y dual-pack (${productYNode?.metrics?.stockDaysLeft || 28}d stock available).`,
        tradeoff: `Bundle margin compresses from ${bundleMargin}% to ${substituteMargin}% (-12% margin tradeoff)`,
        revenueExposureAfter: subExposureAfter,
        revenueProtected: subProtected,
        residualSeverity: subResidualSev,
        effectiveness: 'prevents',
        assumptions: [
          `Margin retention: ${substituteMargin}% substitute margin / ${bundleMargin}% original margin (${Math.round(marginRetentionRatio * 100)}%)`,
          `Product Y has ${productYNode?.metrics?.stockDaysLeft || 28}d stock cover (100% component availability)`,
        ],
      },
      {
        id: 'unbundle-standalone-routing',
        name: 'Unbundle to Standalone Product Y + Add-ons',
        description: 'Deconstruct bundle offer; direct VIP cohorts to standalone attach SKUs.',
        tradeoff: 'Average Order Value declines (basket size compression)',
        revenueExposureAfter: unbundleExposureAfter,
        revenueProtected: unbundleProtected,
        residualSeverity: unbundleResidualSev,
        effectiveness: 'reduces',
        assumptions: [
          'Scenario assumption: VIP basket size retention estimated at 45.5% of bundle price',
        ],
      },
      {
        id: 'expedited-retooling',
        name: 'Emergency Qualification of Secondary SKU Vendor',
        description: 'Accelerate tooling qualification for alternative Product X manufacturer.',
        tradeoff: `${retoolingLeadTime}-day qualification lead time; ₹65K tooling fee with zero week-1 protection`,
        revenueExposureAfter: retoolExposureAfter,
        revenueProtected: retoolProtected,
        residualSeverity: retoolResidualSev,
        effectiveness: 'ineffective',
        assumptions: [
          `Scenario assumption: ${retoolingLeadTime}d lead time allows only 9 days of active recovery in month 1`,
        ],
      },
    ]
  } else if (eventType === 'payment_failure' || focusNodeId === 'razorpay-payments' || focusNodeId === 'checkout-flow') {
    // 1. Razorpay Dynamic Smart Routing & Magic Checkout:
    const baseSuccessRate = paymentNode?.metrics?.successRate || 99.2
    const smartRoutingRecoveryRate = 0.85 // scenario assumption: 85% transient recovery via dynamic UPI retry
    const smartProtected = Math.round(revenueExposureINR * smartRoutingRecoveryRate)
    const smartExposureAfter = revenueExposureINR - smartProtected
    const smartResidualSev = Math.max(12, Math.round(severityScore * (1 - smartRoutingRecoveryRate * 0.8)))

    // 2. WhatsApp Webhook Payment Link Recovery:
    const webhookRecoveryRate = 0.45 // scenario assumption: 45% recovery rate
    const webhookProtected = Math.round(revenueExposureINR * webhookRecoveryRate)
    const webhookExposureAfter = revenueExposureINR - webhookProtected
    const webhookResidualSev = Math.max(20, Math.round(severityScore * (1 - webhookRecoveryRate * 0.6)))

    // 3. COD Fallback with OTP Verification:
    const codGrossRecovery = 0.35
    const rtoReturnRate = 0.22 // scenario assumption: 22% RTO return rate
    const codNetRecovery = codGrossRecovery * (1 - rtoReturnRate) // ~27.3%
    const codProtected = Math.round(revenueExposureINR * codNetRecovery)
    const codExposureAfter = revenueExposureINR - codProtected
    const codResidualSev = Math.max(25, Math.round(severityScore * (1 - codNetRecovery * 0.5)))

    options = [
      {
        id: 'razorpay-smart-routing',
        name: 'Razorpay Dynamic Smart Routing & Magic Checkout',
        description: `Auto-route checkouts to UPI intent with instant retry towards ${baseSuccessRate}% baseline.`,
        tradeoff: '+0.25% payment gateway processing fee on recovered order volume',
        revenueExposureAfter: smartExposureAfter,
        revenueProtected: smartProtected,
        residualSeverity: smartResidualSev,
        effectiveness: 'prevents',
        assumptions: [
          `Base success rate: ${baseSuccessRate}% (from Razorpay node metrics)`,
          'Scenario assumption: 85% recovery on high-ticket failed checkouts via dynamic UPI routing',
        ],
      },
      {
        id: 'webhook-cart-recovery',
        name: 'WhatsApp Webhook Payment Link Recovery',
        description: 'Trigger instant automated Razorpay payment link via WhatsApp within 180 seconds of drop-off.',
        tradeoff: '20-minute user response latency; 45% completion rate',
        revenueExposureAfter: webhookExposureAfter,
        revenueProtected: webhookProtected,
        residualSeverity: webhookResidualSev,
        effectiveness: 'reduces',
        assumptions: [
          'Scenario assumption: 45% link completion rate based on standard e-commerce webhook benchmarks',
        ],
      },
      {
        id: 'cod-fallback-otp',
        name: 'COD Fallback with OTP Verification',
        description: 'Offer Cash on Delivery fallback to prevent cart drop-off.',
        tradeoff: '22% Return-to-Origin (RTO) rate and delayed working capital settlement',
        revenueExposureAfter: codExposureAfter,
        revenueProtected: codProtected,
        residualSeverity: codResidualSev,
        effectiveness: 'reduces',
        assumptions: [
          'Scenario assumption: 35% gross conversion discounted by 22% RTO return rate (27.3% net recovery)',
        ],
      },
    ]
  } else {
    // Generic fallback disruption on any other node
    options = [
      {
        id: 'buffer-rebalancing',
        name: 'Dynamic Upstream Buffer Reallocation',
        description: `Reallocate upstream inventory buffers feeding ${focusNodeId || 'affected entity'}.`,
        tradeoff: 'Minor allocation lead time variance on adjacent supply branches',
        revenueExposureAfter: Math.round(revenueExposureINR * 0.35),
        revenueProtected: Math.round(revenueExposureINR * 0.65),
        residualSeverity: Math.max(15, Math.round(severityScore * 0.45)),
        effectiveness: 'reduces',
        assumptions: ['Scenario assumption: Modeled 65% protection from upstream buffer rebalancing'],
      },
      {
        id: 'demand-throttling',
        name: 'Demand Throttling & Priority Queue',
        description: 'Prioritize critical path fulfillment and throttle secondary order volume.',
        tradeoff: 'Temporary fulfillment delay on low-margin customer tiers',
        revenueExposureAfter: Math.round(revenueExposureINR * 0.60),
        revenueProtected: Math.round(revenueExposureINR * 0.40),
        residualSeverity: Math.max(20, Math.round(severityScore * 0.65)),
        effectiveness: 'reduces',
        assumptions: ['Scenario assumption: Modeled 40% protection by prioritizing high-margin order queue'],
      },
    ]
  }

  // Format currency strings for display
  const formattedOptions = options.map((opt) => ({
    ...opt,
    formattedRevenueExposureAfter: formatCurrencyINR(opt.revenueExposureAfter),
    formattedRevenueProtected: formatCurrencyINR(opt.revenueProtected),
  }))

  // Requirement 3: Normalized dimensionless scoring rule
  // protectionRatio = revenueProtected / revenueExposure
  // residualRiskRatio = residualSeverity / 100
  // score = 0.8 * protectionRatio - 0.2 * residualRiskRatio
  const scored = formattedOptions.map((opt) => {
    const protectionRatio = revenueExposureINR > 0 ? opt.revenueProtected / revenueExposureINR : 0
    const residualRiskRatio = opt.residualSeverity / 100
    const score = 0.8 * protectionRatio - 0.2 * residualRiskRatio
    return {
      ...opt,
      protectionRatio: Math.round(protectionRatio * 1000) / 1000,
      residualRiskRatio: Math.round(residualRiskRatio * 1000) / 1000,
      _score: score,
    }
  })

  scored.sort((a, b) => b._score - a._score)
  const best = scored[0]

  const finalOptions = scored.map((opt) => {
    const { _score, ...rest } = opt
    return {
      ...rest,
      recommended: opt.id === best.id,
    }
  })

  const recommendation = {
    interventionId: best.id,
    name: best.name,
    headline: `Recommended modeled action: ${best.name}`,
    reason: `Protects ${best.formattedRevenueProtected} (${Math.round((best.protectionRatio || 0) * 100)}% of modeled exposure) with residual severity ${best.residualSeverity}/100.`,
    revenueProtected: best.formattedRevenueProtected,
    modeledRevenueProtected: best.formattedRevenueProtected,
    residualExposure: best.formattedRevenueExposureAfter,
    residualSeverity: best.residualSeverity,
    tradeoff: best.tradeoff,
    effectiveness: best.effectiveness,
    assumptions: best.assumptions || [],
  }

  return {
    interventions: finalOptions,
    recommendation,
  }
}

/**
 * Backward-compatible single recommendation accessor.
 */
export function recommendMinimumIntervention(params = {}) {
  const result = generateInterventions(params)
  return {
    type: result.recommendation.interventionId,
    action: result.recommendation.headline,
    impactReduction: `Modeled protection: ${result.recommendation.revenueProtected}; leaves ${result.recommendation.residualExposure} residual exposure.`,
    confidence: 'high',
    recommendation: result.recommendation,
    interventions: result.interventions,
  }
}
