function wrapText(str, maxChars, maxLines) {
  const words = str.split(' ')
  const lines = []
  let current = ''
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = w
    } else {
      current = candidate
    }
    if (lines.length === maxLines) break
  }
  if (current && lines.length < maxLines) lines.push(current)
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*$/, '') + '…'
  }
  return lines
}

/**
 * Floating intelligence annotations — short discovered-fact sentences near
 * the focal node, not a card. Position is computed and clamped by the
 * parent (BusinessGraph), since a node near a viewBox edge can't safely
 * self-anchor its overlay without risking clipping.
 */
export default function GraphInsightOverlay({ x, y, lines }) {
  if (!lines?.length) return null

  return (
    <g className="insight-overlay" style={{ pointerEvents: 'none' }}>
      <line x1={x} y1={y - 14} x2={x} y2={y - 4} stroke="var(--accent-primary)" strokeWidth={1} opacity={0.5} />
      <circle cx={x} cy={y - 16} r={2.5} fill="var(--accent-primary)" opacity={0.85} />
      {lines.map((line, li) => {
        const wrapped = wrapText(line, 46, 2)
        return wrapped.map((wl, wi) => (
          <text
            key={`${li}-${wi}`}
            x={x}
            y={y + li * 30 + wi * 13}
            textAnchor="middle"
            className={wi === 0 && li === 0 ? 'overlay-line-primary' : 'overlay-line'}
          >
            {wl}
          </text>
        ))
      })}
    </g>
  )
}
