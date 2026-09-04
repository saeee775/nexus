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
 * and algorithmically selects the recommended modeled business action.
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
    const leadTimeDelta = suppBLeadTime - suppALeadTime // +7 days
    const compressedDays = Math.min(leadTimeDelta, 4) // scenario assumption: 4 days compressed via expedited transit
    const residualLeadTimeDelta = leadTimeDelta - compressedDays // +3 days
    const leadTimePenalty = residualLeadTimeDelta / suppBLeadTime // 3 / 19 ≈ 0.158
    const supplierBProtectionRatio = Math.min(0.95, Math.max(0.4, suppBReliability * (1 - leadTimePenalty)))
    const expeditedFreightSurchargePct = Math.round(leadTimeDelta * 1.14) // scenario assumption: +8% unit freight cost

    const suppBProtected = Math.round(revenueExposureINR * supplierBProtectionRatio)
    const suppBExposureAfter = revenueExposureINR - suppBProtected
    const suppBResidualSev = Math.max(12, Math.round(severityScore * (1 - supplierBProtectionRatio * 0.85)))

    // 2. Reallocate Shared Inventory Buffer:
    // Shared inventory has 9 days cover. Deficit is deficitDays.
    const sharedCover = sharedInvNode?.metrics?.stockDaysLeft || 9
    const prodYStock = productYNode?.metrics?.stockDaysLeft || 28
    const bufferCoverageRatio = deficitDays > 0 ? Math.min(1, sharedCover / deficitDays) : 1
    const sharedEdgeToX = edges.find((e) => e.source === 'shared-inventory' && e.target === 'product-x')
    const sharedEdgeToY = edges.find((e) => e.source === 'shared-inventory' && e.target === 'product-y')
    const edgeEfficiency = sharedEdgeToX?.strength || 0.70
    const strainFactor = sharedEdgeToY?.strength || 0.45
    const sharedProtectionRatio = Math.min(0.9, Math.max(0.3, bufferCoverageRatio * edgeEfficiency * (1 - strainFactor * 0.25)))

    const sharedProtected = Math.round(revenueExposureINR * sharedProtectionRatio)
    const sharedExposureAfter = revenueExposureINR - sharedProtected
    const sharedResidualSev = Math.max(18, Math.round(severityScore * (1 - sharedProtectionRatio * 0.75)))

    // 3. Ration Stock for VIP Customer Cohort:
    // VIP cohort share: 42%, Repeat cohort share: 19%.
    const vipShare = vipNode?.metrics?.revenueShare || 42
    const repeatNode = nodes.find((n) => n.id === 'repeat-customers')
    const repeatShare = repeatNode?.metrics?.revenueShare || 19
    const repeatCohortSize = repeatNode?.metrics?.cohortSize || 940
    const vipProtectionRatio = (vipShare / (vipShare + repeatShare)) * 0.80 // scenario assumption: 20% non-VIP churn risk

    const vipProtected = Math.round(revenueExposureINR * vipProtectionRatio)
    const vipExposureAfter = revenueExposureINR - vipProtected
    const vipResidualSev = Math.max(22, Math.round(severityScore * (1 - vipProtectionRatio * 0.65)))

    options = [
      {
        id: 'expedite-supplier-b',
        name: 'Expedite Supplier B (Backup)',
        description: `Re-route restock to Supplier B (${suppBLeadTime}d standard lead time) to cover ${deficitDays}d stockout deficit.`,
        tradeoff: `+${leadTimeDelta}d standard lead time compressed by ${compressedDays}d to +${residualLeadTimeDelta}d with freight surcharge; unit cost +${expeditedFreightSurchargePct}%`,
        revenueExposureAfter: suppBExposureAfter,
        revenueProtected: suppBProtected,
        residualSeverity: suppBResidualSev,
        effectiveness: supplierBProtectionRatio > 0.75 ? 'prevents' : 'reduces',
        assumptions: [
          `Supplier B reliability (${supplierBNode?.metrics?.reliability || 94}%) utilized as secondary source`,
          `Lead time delta of +${leadTimeDelta}d (${suppBLeadTime}d vs ${suppALeadTime}d) compressed by ${compressedDays}d to +${residualLeadTimeDelta}d`,
          `Scenario assumption: Expedited transit leaves ${Math.round(leadTimePenalty * 100)}% residual lead time variance with +${expeditedFreightSurchargePct}% freight surcharge`,
        ],
      },
      {
        id: 'draw-shared-inventory',
        name: 'Reallocate Shared Inventory Buffer',
        description: `Dedicate Shared Inventory buffer (${sharedCover}d cover) exclusively to Product X assembly.`,
        tradeoff: `Depletes shared safety pool; reduces Product Y cover from ${prodYStock}d to ${Math.max(0, prodYStock - deficitDays)}d`,
        revenueExposureAfter: sharedExposureAfter,
        revenueProtected: sharedProtected,
        residualSeverity: sharedResidualSev,
        effectiveness: 'reduces',
        assumptions: [
          `Shared inventory pool has ${sharedCover}d cover vs ${deficitDays}d deficit`,
          `Transfer efficiency (${edgeEfficiency}) derived from shared-inventory → product-x edge strength`,
          `Draw creates secondary strain on Product Y branch (edge strength ${strainFactor})`,
        ],
      },
      {
        id: 'ration-vip-priority',
        name: 'Ration Stock for VIP Customer Cohort',
        description: `Allocate remaining stock exclusively to VIP cohort (${vipShare}% revenue share), deferring repeat cohort orders.`,
        tradeoff: `Order deferral for non-VIP customer segment (${repeatShare}% revenue share, ${repeatCohortSize} customers)`,
        revenueExposureAfter: vipExposureAfter,
        revenueProtected: vipProtected,
        residualSeverity: vipResidualSev,
        effectiveness: 'reduces',
        assumptions: [
          `VIP cohort represents ${vipShare}% of revenue vs Repeat cohort ${repeatShare}% (from customer cohort metrics)`,
          'Scenario assumption: 20% churn risk on deferred non-VIP customer orders',
        ],
      },
    ]
  } else if (eventType === 'product_unavailable' || focusNodeId === 'product-x') {
    // 1. Substitute Product Y into Bundle Core Slot:
    // Margin retention: Product Y margin ~34% vs Bundle margin 46% (from bundleNode.metrics.margin)
    const bundleMargin = bundleNode?.metrics?.margin || 46
    const substituteMargin = 34 // scenario assumption: reconfigured bundle margin
    const marginRetentionRatio = substituteMargin / bundleMargin // 34 / 46 = 73.9%
    const subStockDays = productYNode?.metrics?.stockDaysLeft || 28
    const stockCoverRatio = Math.min(1, subStockDays / 30) // 28 / 30 = 93.3%
    const subProtectionRate = marginRetentionRatio * stockCoverRatio // 73.9% * 93.3% = 69.0%
    const subProtected = Math.round(revenueExposureINR * subProtectionRate)
    const subExposureAfter = revenueExposureINR - subProtected
    const subResidualSev = Math.max(18, Math.round(severityScore * (1 - subProtectionRate * 0.75)))

    // 2. Unbundle to Standalone Product Y + Add-ons:
    const prodYDirect = productYNode?.metrics?.directRevenue || 11
    const prodYDownstream = productYNode?.metrics?.downstreamInfluence || 14
    const prodXDownstream = productXNode?.metrics?.downstreamInfluence || 31
    const unbundleCaptureRatio = (prodYDirect + prodYDownstream) / prodXDownstream // 25 / 31 = 80.6%
    const standaloneBasketConversion = 0.55 // scenario assumption: 55% VIP conversion efficiency when unbundled
    const unbundleProtectionRatio = Math.min(0.7, Math.max(0.25, unbundleCaptureRatio * standaloneBasketConversion)) // ~44.3%
    const unbundleProtected = Math.round(revenueExposureINR * unbundleProtectionRatio)
    const unbundleExposureAfter = revenueExposureINR - unbundleProtected
    const unbundleResidualSev = Math.max(25, Math.round(severityScore * (1 - unbundleProtectionRatio * 0.6)))

    // 3. Emergency Retooling with Secondary SKU Vendor:
    const retoolingLeadTime = 21 // scenario assumption: 21d tooling qualification
    const activeRecoveryDays = Math.max(0, 30 - retoolingLeadTime) // 9 days
    const cycleRecoveryRatio = activeRecoveryDays / 30 // 30%
    const rampDiscount = 0.70 // scenario assumption: 30% discount during initial batch ramp
    const retoolProtectionRatio = cycleRecoveryRatio * rampDiscount // 21%
    const retoolProtected = Math.round(revenueExposureINR * retoolProtectionRatio)
    const retoolExposureAfter = revenueExposureINR - retoolProtected
    const retoolResidualSev = Math.max(30, Math.round(severityScore * (1 - retoolProtectionRatio * 0.5)))

    options = [
      {
        id: 'substitute-bundle-core',
        name: 'Substitute Product Y into Bundle Core Slot',
        description: `Reconfigure Premium Bundle recipe with Product Y dual-pack (${subStockDays}d stock available).`,
        tradeoff: `Bundle margin compresses from ${bundleMargin}% to ${substituteMargin}% (-${bundleMargin - substituteMargin}% margin tradeoff)`,
        revenueExposureAfter: subExposureAfter,
        revenueProtected: subProtected,
        residualSeverity: subResidualSev,
        effectiveness: 'prevents',
        assumptions: [
          `Substitute stock cover: Product Y has ${subStockDays}d stock cover (${Math.round(stockCoverRatio * 100)}% monthly coverage)`,
          `Margin retention: ${substituteMargin}% substitute margin / ${bundleMargin}% original bundle margin (${Math.round(marginRetentionRatio * 100)}% retention)`,
          'Scenario assumption: Reconfigured bundle retains 34% gross margin (derived from standalone attach margin baseline)',
        ],
      },
      {
        id: 'unbundle-standalone-routing',
        name: 'Unbundle to Standalone Product Y + Add-ons',
        description: 'Deconstruct bundle offer; direct VIP cohorts to standalone attach SKUs.',
        tradeoff: 'Average Order Value declines from bundle price to standalone attach rate; basket conversion efficiency drops to 55%',
        revenueExposureAfter: unbundleExposureAfter,
        revenueProtected: unbundleProtected,
        residualSeverity: unbundleResidualSev,
        effectiveness: 'reduces',
        assumptions: [
          `Product Y direct share (${prodYDirect}%) and downstream influence (${prodYDownstream}%) vs Product X downstream (${prodXDownstream}%)`,
          'Scenario assumption: 55% VIP cohort basket conversion efficiency when unbundled',
        ],
      },
      {
        id: 'expedited-retooling',
        name: 'Emergency Qualification of Secondary SKU Vendor',
        description: 'Accelerate tooling qualification for alternative Product X manufacturer.',
        tradeoff: `${retoolingLeadTime}-day qualification lead time leaves zero protection during first 3 weeks; ₹65K tooling fee`,
        revenueExposureAfter: retoolExposureAfter,
        revenueProtected: retoolProtected,
        residualSeverity: retoolResidualSev,
        effectiveness: 'ineffective',
        assumptions: [
          `Scenario assumption: ${retoolingLeadTime}d lead time allows only ${activeRecoveryDays} active production days in 30-day billing cycle`,
          'Scenario assumption: 30% initial batch ramp discount during quality qualification',
        ],
      },
    ]
  } else if (eventType === 'payment_failure' || focusNodeId === 'razorpay-payments' || focusNodeId === 'checkout-flow') {
    // 1. Razorpay Dynamic Smart Routing & Magic Checkout:
    const baseSuccessRate = paymentNode?.metrics?.successRate || 99.2
    const dailyVolume = paymentNode?.metrics?.dailyVolume || 386
    const avgTicketRaw = typeof paymentNode?.metrics?.avgTicket === 'string' ? parseInt(paymentNode.metrics.avgTicket.replace(/[^0-9]/g, '')) || 2140 : 2140
    const failureDelta = 0.15
    const monthlyTxnVolume = dailyVolume * 30 // 11,580
    const monthlyFailedTxns = Math.round(monthlyTxnVolume * failureDelta) // 1,737

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
        tradeoff: `+0.25% payment gateway processing fee on recovered order volume (~${Math.round(monthlyFailedTxns * smartRoutingRecoveryRate)} recovered transactions/month)`,
        revenueExposureAfter: smartExposureAfter,
        revenueProtected: smartProtected,
        residualSeverity: smartResidualSev,
        effectiveness: 'prevents',
        assumptions: [
          `Baseline success rate of ${baseSuccessRate}% across ${dailyVolume} daily transactions (from Razorpay signal metrics)`,
          `Payment failure delta generates ~${monthlyFailedTxns} failed checkouts/month at ₹${avgTicketRaw.toLocaleString('en-IN')} avg ticket size`,
          'Scenario assumption: 85% of gateway drop-offs are transient network/banking failures recoverable via dynamic UPI retry',
        ],
      },
      {
        id: 'webhook-cart-recovery',
        name: 'WhatsApp Webhook Payment Link Recovery',
        description: 'Trigger instant automated Razorpay payment link via WhatsApp within 180 seconds of drop-off.',
        tradeoff: `20-minute user response latency; 45% completion rate across ${monthlyFailedTxns} drop-off payment links`,
        revenueExposureAfter: webhookExposureAfter,
        revenueProtected: webhookProtected,
        residualSeverity: webhookResidualSev,
        effectiveness: 'reduces',
        assumptions: [
          `Monthly drop-off volume: ${monthlyFailedTxns} failed checkouts at ₹${avgTicketRaw.toLocaleString('en-IN')} avg ticket size`,
          'Scenario assumption: 45% link completion rate based on standard e-commerce webhook benchmarks',
        ],
      },
      {
        id: 'cod-fallback-otp',
        name: 'COD Fallback with OTP Verification',
        description: 'Offer Cash on Delivery fallback to prevent cart drop-off.',
        tradeoff: `22% Return-to-Origin (RTO) rate and delayed working capital settlement across ${monthlyFailedTxns} orders`,
        revenueExposureAfter: codExposureAfter,
        revenueProtected: codProtected,
        residualSeverity: codResidualSev,
        effectiveness: 'reduces',
        assumptions: [
          `Gross COD cart conversion of 35% across ${monthlyFailedTxns} failed transactions`,
          'Scenario assumption: 22% RTO return rate cancels out gross deliveries, leaving 27.3% net revenue realization',
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
