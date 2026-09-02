// Structured mock Razorpay economic signals. Shape mirrors what a future
// Phase 4 integration would pull from the Razorpay Orders/Payments API,
// so the intelligence + engine layers can be wired to live data later
// without a data-shape rewrite.

export const mockPaymentSignals = {
  successRate: 99.2,
  failedPayments24h: 4,
  refunds7d: 3,
  avgTicketSize: 2140,
  dailyVolume: 386,
  trend: 'stable',
}

export const mockRecentTransactions = [
  { id: 'pay_NX3821', status: 'captured', amount: 4850, product: 'Premium Bundle', cohort: 'VIP' },
  { id: 'pay_NX3820', status: 'captured', amount: 1290, product: 'Product Y', cohort: 'Standard' },
  { id: 'pay_NX3819', status: 'failed', amount: 4850, product: 'Premium Bundle', cohort: 'VIP' },
  { id: 'pay_NX3818', status: 'captured', amount: 2140, product: 'Product X', cohort: 'Standard' },
  { id: 'pay_NX3817', status: 'refunded', amount: 4850, product: 'Premium Bundle', cohort: 'VIP' },
  { id: 'pay_NX3816', status: 'captured', amount: 4850, product: 'Premium Bundle', cohort: 'VIP' },
]

export const mockRevenueByProduct = [
  { product: 'Premium Bundle', directShare: 22, downstreamShare: 31 },
  { product: 'Product X', directShare: 8, downstreamShare: 31 },
  { product: 'Product Y', directShare: 11, downstreamShare: 14 },
  { product: 'Other SKUs', directShare: 59, downstreamShare: 24 },
]
