// PHASE 4 — Razorpay Economic Signal Layer
//
// Not implemented in Phase 1. Will connect to Razorpay test mode (Orders,
// Payments APIs) to feed real payment success/failure, refund, and volume
// signals into the Business Digital Twin. Phase 1 uses structured mock
// data from src/data/mockTransactions.js that mirrors this future shape.

export async function fetchPaymentSignals() {
  throw new Error('razorpayService.fetchPaymentSignals is implemented in Phase 4.')
}

export async function fetchRecentTransactions() {
  throw new Error('razorpayService.fetchRecentTransactions is implemented in Phase 4.')
}
