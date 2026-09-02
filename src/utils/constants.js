// Shared enums and design tokens referenced across data, engine, and UI layers.

export const NODE_TYPES = {
  SUPPLIER: 'supplier',
  PRODUCT: 'product',
  BUNDLE: 'bundle',
  CUSTOMER_COHORT: 'customer_cohort',
  REVENUE: 'revenue',
  SIGNAL: 'signal', // Razorpay economic signal layer
}

export const HEALTH = {
  HEALTHY: 'healthy',
  WARNING: 'warning',
  CRITICAL: 'critical',
}

export const HEALTH_COLOR = {
  [HEALTH.HEALTHY]: '#62c98b',
  [HEALTH.WARNING]: '#ffb347',
  [HEALTH.CRITICAL]: '#ff5c4d',
}

export const HEALTH_SOFT_COLOR = {
  [HEALTH.HEALTHY]: 'rgba(98, 201, 139, 0.14)',
  [HEALTH.WARNING]: 'rgba(255, 179, 71, 0.14)',
  [HEALTH.CRITICAL]: 'rgba(255, 92, 77, 0.14)',
}

// LIME is the NEXUS signature color — reserved for active/live/selected
// states only (per design system rule: used sparingly, never decorative).
// INTELLIGENCE (violet) marks anything the NEXUS AI itself is surfacing —
// insights, the AI brain, Razorpay economic signal edges, command bar.
export const ACCENT = {
  LIME: '#c6ff3b',
  INTELLIGENCE: '#8b7cff',
}

// Visual importance drives node radius + label weight in the twin graph.
export const NODE_IMPORTANCE = {
  MINOR: 'minor',
  STANDARD: 'standard',
  MAJOR: 'major',
  HERO: 'hero',
}
