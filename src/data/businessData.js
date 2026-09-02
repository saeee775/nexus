import { NODE_TYPES, HEALTH, NODE_IMPORTANCE } from '../utils/constants'

// ============================================================
// BUSINESS DIGITAL TWIN — ECOSYSTEM DATA
// Hand-positioned on viewBox 0 0 1000 560 as an asymmetric vertical
// economic landscape (Supply → Product → Demand → Revenue), with
// substantial negative space. Critical nodes never share a cluster.
// ============================================================

export const VIEW_W = 1000
export const VIEW_H = 560
export const GRAPH_SAFE = { x: 72, y: 48, w: 856, h: 452 }

export const clusters = [
  { id: 'supply', label: 'Supply', cx: 148, cy: 188, rx: 132, ry: 168 },
  { id: 'products', label: 'Product Ecosystem', cx: 392, cy: 228, rx: 148, ry: 178 },
  { id: 'customers', label: 'Customer Demand', cx: 728, cy: 228, rx: 138, ry: 158 },
  { id: 'signals', label: 'Economic Signals', cx: 520, cy: 498, rx: 190, ry: 42 },
  { id: 'revenue', label: 'Revenue Outcome', cx: 860, cy: 440, rx: 100, ry: 78 },
]

export const businessNodes = [
  // ---------------- SUPPLY ----------------
  {
    id: 'supplier-a',
    type: NODE_TYPES.SUPPLIER,
    label: 'Supplier A',
    sublabel: 'Primary Supplier',
    cluster: 'supply',
    x: 158,
    y: 72,
    health: HEALTH.CRITICAL,
    importance: NODE_IMPORTANCE.STANDARD,
    metrics: {
      reliability: 81,
      leadTime: '12 days',
      revenueExposure: 31,
      revenueAtRisk: '₹78.5K',
      dependency: 54,
    },
    insight:
      'Sole active source for Product X. A 10-day delay here has no buffered alternative in the next 72 hours.',
    drilldown: [
      { label: 'Raw Material Source', sublabel: 'Tier-2 dependency' },
      { label: 'Packaging Dependency', sublabel: 'Shared with Supplier B' },
    ],
  },
  {
    id: 'supplier-b',
    type: NODE_TYPES.SUPPLIER,
    label: 'Supplier B',
    sublabel: 'Backup Supplier',
    cluster: 'supply',
    x: 78,
    y: 218,
    health: HEALTH.HEALTHY,
    importance: NODE_IMPORTANCE.MINOR,
    metrics: {
      reliability: 94,
      leadTime: '19 days',
      revenueExposure: 4,
      dependency: 12,
    },
    insight: 'Reliable, but lead time is 7 days longer than Supplier A — not a same-week substitute.',
  },
  {
    id: 'packaging-vendor',
    type: NODE_TYPES.SUPPLIER,
    label: 'Packaging Vendor',
    sublabel: 'Shared Dependency',
    cluster: 'supply',
    x: 168,
    y: 358,
    health: HEALTH.HEALTHY,
    importance: NODE_IMPORTANCE.MINOR,
    metrics: {
      reliability: 97,
      leadTime: '5 days',
      revenueExposure: 2,
      dependency: 9,
    },
    insight: 'Low individual risk, but feeds packaging for every SKU in Product X — worth watching at scale.',
  },

  // ---------------- PRODUCTS ----------------
  {
    id: 'shared-inventory',
    type: NODE_TYPES.PRODUCT,
    label: 'Shared Inventory Buffer',
    sublabel: 'Cross-Product Stock Pool',
    cluster: 'products',
    x: 398,
    y: 86,
    health: HEALTH.WARNING,
    importance: NODE_IMPORTANCE.MINOR,
    metrics: {
      directRevenue: 0,
      downstreamInfluence: 22,
      stockDaysLeft: 9,
      dependency: 38,
    },
    insight:
      'A hidden single point of failure — Product X and Product Y both draw from this same buffer.',
  },
  {
    id: 'product-x',
    type: NODE_TYPES.PRODUCT,
    label: 'Product X',
    sublabel: 'Bestseller Component',
    cluster: 'products',
    x: 328,
    y: 238,
    health: HEALTH.WARNING,
    importance: NODE_IMPORTANCE.MAJOR,
    metrics: {
      directRevenue: 8,
      downstreamInfluence: 31,
      stockDaysLeft: 6,
      dependency: 46,
    },
    insight:
      'Generates only 8% of direct revenue, but influences 31% of downstream revenue through Premium Bundle.',
    drilldown: [{ label: 'Inventory Buffer', sublabel: '6 days of cover left' }],
  },
  {
    id: 'product-y',
    type: NODE_TYPES.PRODUCT,
    label: 'Product Y',
    sublabel: 'Complementary Product',
    cluster: 'products',
    x: 418,
    y: 358,
    health: HEALTH.HEALTHY,
    importance: NODE_IMPORTANCE.STANDARD,
    metrics: {
      directRevenue: 11,
      downstreamInfluence: 14,
      stockDaysLeft: 28,
      dependency: 18,
    },
    insight: 'Stable stock position. Feeds both Premium Bundle and standalone Add-on Revenue.',
  },

  // ---------------- OFFERS (sit in the product → demand corridor) ----------------
  {
    id: 'premium-bundle',
    type: NODE_TYPES.BUNDLE,
    label: 'Premium Bundle',
    sublabel: 'High-Margin Offer',
    cluster: 'products',
    x: 548,
    y: 248,
    health: HEALTH.WARNING,
    importance: NODE_IMPORTANCE.HERO,
    metrics: {
      directRevenue: 22,
      downstreamInfluence: 31,
      margin: 46,
      dependency: 46,
    },
    insight:
      'Central economic node. Depends on Product X availability and drives most VIP cohort purchases.',
  },
  {
    id: 'addon-revenue',
    type: NODE_TYPES.BUNDLE,
    label: 'Add-on Revenue',
    sublabel: 'Standalone Attach Sales',
    cluster: 'products',
    x: 528,
    y: 418,
    health: HEALTH.HEALTHY,
    importance: NODE_IMPORTANCE.MINOR,
    metrics: {
      directRevenue: 9,
      downstreamInfluence: 6,
      margin: 31,
      dependency: 14,
    },
    insight: 'Small but healthy revenue line, entirely dependent on Product Y availability.',
  },

  // ---------------- CUSTOMERS ----------------
  {
    id: 'vip-customers',
    type: NODE_TYPES.CUSTOMER_COHORT,
    label: 'VIP Customers',
    sublabel: 'High-Value Cohort',
    cluster: 'customers',
    x: 718,
    y: 168,
    health: HEALTH.WARNING,
    importance: NODE_IMPORTANCE.MAJOR,
    metrics: {
      revenueShare: 42,
      cohortSize: 312,
      avgOrderValue: '₹4,850',
      dependency: 42,
    },
    insight:
      '42% of total revenue is linked to this cohort — concentrated exposure if Premium Bundle availability drops.',
  },
  {
    id: 'repeat-customers',
    type: NODE_TYPES.CUSTOMER_COHORT,
    label: 'Repeat Customers',
    sublabel: 'Recurring Cohort',
    cluster: 'customers',
    x: 778,
    y: 308,
    health: HEALTH.HEALTHY,
    importance: NODE_IMPORTANCE.MINOR,
    metrics: {
      revenueShare: 19,
      cohortSize: 940,
      avgOrderValue: '₹1,420',
      dependency: 10,
    },
    insight: 'Broad, low-concentration base — the steadiest revenue segment in the ecosystem.',
  },

  // ---------------- ECONOMIC SIGNALS (quiet; the stream is the visual) ----------------
  {
    id: 'razorpay-payments',
    type: NODE_TYPES.SIGNAL,
    label: 'Razorpay',
    sublabel: 'Payment Signal',
    cluster: 'signals',
    x: 400,
    y: 498,
    health: HEALTH.HEALTHY,
    importance: NODE_IMPORTANCE.MINOR,
    metrics: {
      successRate: 99.2,
      avgTicket: '₹2,140',
      dailyVolume: 386,
      revenueFlow: 100,
    },
    insight: 'Payment success sits at 99.2% — the foundation signal every downstream revenue node depends on.',
  },
  {
    id: 'checkout-flow',
    type: NODE_TYPES.SIGNAL,
    label: 'Checkout',
    sublabel: 'Conversion',
    cluster: 'signals',
    x: 612,
    y: 498,
    health: HEALTH.HEALTHY,
    importance: NODE_IMPORTANCE.MINOR,
    metrics: {
      successRate: 97.6,
      avgTicket: '₹2,140',
      dailyVolume: 372,
      revenueFlow: 96,
    },
    insight: 'Checkout friction here is the fastest lever on Premium Bundle conversion, ahead of pricing.',
  },

  // ---------------- OUTCOME ----------------
  {
    id: 'revenue',
    type: NODE_TYPES.REVENUE,
    label: 'Revenue',
    sublabel: 'Economic Outcome',
    cluster: 'revenue',
    x: 862,
    y: 438,
    health: HEALTH.HEALTHY,
    importance: NODE_IMPORTANCE.HERO,
    metrics: {
      monthly: '₹18.45L',
      atRisk: '₹2L',
      growth: 14.2,
      riskSensitivity: 38,
    },
    insight: 'Final outcome node. Aggregates VIP + repeat cohort spend and Razorpay-confirmed payment volume.',
  },
]

export const businessEdges = [
  { id: 'e-suppliera-sharedinv', source: 'supplier-a', target: 'shared-inventory', kind: 'standard', label: 'fills buffer', strength: 0.55 },
  { id: 'e-suppliera-productx', source: 'supplier-a', target: 'product-x', kind: 'critical', label: 'restocks', strength: 0.92 },
  { id: 'e-supplierb-productx', source: 'supplier-b', target: 'product-x', kind: 'backup', label: 'backup supply', strength: 0.28 },
  { id: 'e-packaging-productx', source: 'packaging-vendor', target: 'product-x', kind: 'standard', label: 'packaging', strength: 0.35 },
  { id: 'e-sharedinv-productx', source: 'shared-inventory', target: 'product-x', kind: 'standard', label: 'shared buffer', hidden: true, strength: 0.7 },
  { id: 'e-sharedinv-producty', source: 'shared-inventory', target: 'product-y', kind: 'standard', label: 'shared buffer', hidden: true, strength: 0.45 },
  { id: 'e-productx-bundle', source: 'product-x', target: 'premium-bundle', kind: 'critical', label: 'core component', strength: 0.88 },
  { id: 'e-producty-bundle', source: 'product-y', target: 'premium-bundle', kind: 'standard', label: 'pairs with', strength: 0.42 },
  { id: 'e-producty-addon', source: 'product-y', target: 'addon-revenue', kind: 'standard', label: 'drives', strength: 0.38 },
  { id: 'e-productx-vip', source: 'product-x', target: 'vip-customers', kind: 'standard', label: 'hidden pull', hidden: true, strength: 0.5 },
  { id: 'e-bundle-vip', source: 'premium-bundle', target: 'vip-customers', kind: 'critical', label: 'primary purchase', strength: 0.9 },
  { id: 'e-vip-revenue', source: 'vip-customers', target: 'revenue', kind: 'critical', label: 'drives', strength: 0.95 },
  { id: 'e-repeat-revenue', source: 'repeat-customers', target: 'revenue', kind: 'standard', label: 'drives', strength: 0.4 },
  { id: 'e-addon-revenue', source: 'addon-revenue', target: 'revenue', kind: 'standard', label: 'contributes', strength: 0.32 },
  { id: 'e-razorpay-checkout', source: 'razorpay-payments', target: 'checkout-flow', kind: 'signal', label: 'authorizes', strength: 0.6 },
  { id: 'e-checkout-revenue', source: 'checkout-flow', target: 'revenue', kind: 'signal', label: 'confirms', strength: 0.72 },
  { id: 'e-checkout-bundle', source: 'checkout-flow', target: 'premium-bundle', kind: 'signal', label: 'checkout friction', hidden: true, strength: 0.48 },
]

export const businessMetrics = {
  monitoredEntities: 28,
  ecosystemHealth: 94,
  revenue: {
    value: '₹18.45L',
    delta: 14.2,
    caption: 'Monthly business velocity improving',
  },
  paymentHealth: {
    value: '99.2%',
    caption: 'Razorpay economic signals',
  },
  inventoryRisk: {
    value: '2 alerts',
    caption: 'Product X approaching critical level',
  },
  customerExposure: {
    value: '42%',
    caption: 'Revenue linked to VIP cohort',
  },
}

export const hiddenDependency = {
  title: 'Hidden Dependency Detected',
  nodeId: 'product-x',
  body: 'Product X generates only 8% of direct revenue but influences 31% of downstream revenue.',
  path: ['Product X', 'Premium Bundle', 'VIP Customers', 'Revenue'],
}

export const cascadeRisk = {
  score: 38,
  max: 100,
  label: 'Moderate vulnerability',
  steps: [
    { text: 'Supplier delay', emphasis: false },
    { text: 'Inventory depletion', emphasis: false },
    { text: 'Bundle availability drops', emphasis: false },
    { text: 'VIP customer exposure', emphasis: false },
    { text: '₹2L revenue at risk', emphasis: true },
  ],
}
