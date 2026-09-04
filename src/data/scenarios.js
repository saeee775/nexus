// Scenario definitions. `hops` drive the causal cascade on the Twin:
// node arrivals and travelling-edge beats are timed independently so the
// impact physically moves along the dependency path.
//
// Structured `event` parameters allow the Phase 2.2 Simulation Engine to
// compute cascading consequences dynamically across the graph.

export const scenarios = [
  {
    id: 'supplier-a-delay',
    prompt: 'Supplier A delayed by 10 days',
    query: 'What happens if Supplier A is delayed by 10 days?',
    event: {
      type: 'supplier_delay',
      nodeId: 'supplier-a',
      delayDays: 10,
    },
    affectedNodeIds: ['supplier-a', 'shared-inventory', 'product-x', 'premium-bundle', 'vip-customers', 'revenue'],
    focusNodeId: 'supplier-a',
    hops: [
      { t: 0, nodeId: 'supplier-a' },
      { t: 400, edgeId: 'e-suppliera-sharedinv', travel: true, dur: 600 },
      { t: 1000, nodeId: 'shared-inventory', edgeId: 'e-suppliera-sharedinv' },
      { t: 1000, edgeId: 'e-sharedinv-productx', travel: true, dur: 500 },
      { t: 1500, nodeId: 'product-x', edgeId: 'e-sharedinv-productx' },
      { t: 1500, edgeId: 'e-productx-bundle', travel: true, dur: 500 },
      { t: 2000, nodeId: 'premium-bundle', edgeId: 'e-productx-bundle' },
      { t: 2000, edgeId: 'e-bundle-vip', travel: true, dur: 500 },
      { t: 2500, nodeId: 'vip-customers', edgeId: 'e-bundle-vip' },
      { t: 2500, edgeId: 'e-vip-revenue', travel: true, dur: 500 },
      { t: 3000, nodeId: 'revenue', edgeId: 'e-vip-revenue' },
    ],
    preview: {
      headline: 'Supplier A delay → cascading exposure',
      body:
        'A 10-day delay drains Product X stock within 6 days, disrupting Premium Bundle availability for the VIP cohort.',
      impact: '₹2L estimated revenue exposure',
      confidence: 'high',
    },
  },
  {
    id: 'product-x-discontinued',
    prompt: 'Product X discontinued',
    query: 'What happens if Product X is discontinued?',
    event: {
      type: 'product_unavailable',
      nodeId: 'product-x',
      unavailabilityPct: 1,
    },
    affectedNodeIds: ['product-x', 'premium-bundle', 'vip-customers', 'revenue'],
    focusNodeId: 'product-x',
    hops: [
      { t: 0, nodeId: 'product-x' },
      { t: 400, edgeId: 'e-productx-bundle', travel: true, dur: 600 },
      { t: 1000, nodeId: 'premium-bundle', edgeId: 'e-productx-bundle' },
      { t: 1000, edgeId: 'e-bundle-vip', travel: true, dur: 500 },
      { t: 1500, nodeId: 'vip-customers', edgeId: 'e-bundle-vip' },
      { t: 1500, edgeId: 'e-vip-revenue', travel: true, dur: 500 },
      { t: 2000, nodeId: 'revenue', edgeId: 'e-vip-revenue' },
    ],
    preview: {
      headline: 'Product X removal → bundle collapse risk',
      body:
        'Premium Bundle loses its core component. Without a substitute, VIP purchase rate for the bundle falls sharply.',
      impact: '31% downstream revenue exposed',
      confidence: 'high',
    },
  },
  {
    id: 'payment-success-drop',
    prompt: 'Payment success drops 15%',
    query: 'What happens if payment success drops 15%?',
    event: {
      type: 'payment_failure',
      nodeId: 'razorpay-payments',
      failureRateDelta: 0.15,
    },
    affectedNodeIds: ['razorpay-payments', 'checkout-flow', 'premium-bundle', 'revenue'],
    focusNodeId: 'razorpay-payments',
    hops: [
      { t: 0, nodeId: 'razorpay-payments' },
      { t: 400, edgeId: 'e-razorpay-checkout', travel: true, dur: 500 },
      { t: 900, nodeId: 'checkout-flow', edgeId: 'e-razorpay-checkout' },
      { t: 900, edgeId: 'e-checkout-bundle', travel: true, dur: 500 },
      { t: 1400, nodeId: 'premium-bundle', edgeId: 'e-checkout-bundle' },
      { t: 1400, edgeId: 'e-checkout-revenue', travel: true, dur: 600 },
      { t: 2000, nodeId: 'revenue', edgeId: 'e-checkout-revenue' },
    ],
    preview: {
      headline: 'Payment friction → checkout leakage',
      body:
        'A 15% drop in Razorpay payment success rate increases checkout abandonment on Premium Bundle purchases.',
      impact: '~₹1.4L estimated revenue exposure',
      confidence: 'medium',
    },
  },
]
