// Formatting helpers tuned for Indian merchant context (₹, lakhs).

export function formatINRLakhs(value) {
  // value expected in raw rupees
  const lakhs = value / 100000
  return `₹${lakhs.toFixed(2)}L`
}

export function formatINR(value) {
  return `₹${value.toLocaleString('en-IN')}`
}

export function formatPercent(value, opts = {}) {
  const { showSign = false, decimals = 1 } = opts
  const sign = showSign && value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function clampPercent(value) {
  return Math.max(0, Math.min(100, value))
}
