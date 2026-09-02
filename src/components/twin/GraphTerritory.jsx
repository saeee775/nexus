const CONTOUR_JITTER = [1, 0.9, 1.08, 0.94, 1.12, 0.91, 1.04, 0.97]

function buildContourPath(cx, cy, rx, ry) {
  const points = CONTOUR_JITTER.map((j, i) => {
    const angle = (Math.PI * 2 * i) / CONTOUR_JITTER.length
    return [cx + Math.cos(angle) * rx * j, cy + Math.sin(angle) * ry * j]
  })
  const d = points
    .map(([x, y], i) => {
      if (i === 0) return `M ${x.toFixed(1)} ${y.toFixed(1)}`
      const [px, py] = points[i - 1]
      const mx = (px + x) / 2
      const my = (py + y) / 2
      return `Q ${px.toFixed(1)} ${py.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`
    })
    .join(' ')
  return `${d} Z`
}

export default function GraphTerritory({ cluster, faded }) {
  const contour = buildContourPath(cluster.cx, cluster.cy, cluster.rx, cluster.ry)
  const gradId = `territory-${cluster.id}`

  return (
    <g className="territory" opacity={faded ? 0.28 : 1} style={{ transition: 'opacity 0.4s ease' }}>
      <defs>
        <radialGradient id={gradId} cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#e8e6df" stopOpacity="0.045" />
          <stop offset="70%" stopColor="#e8e6df" stopOpacity="0.012" />
          <stop offset="100%" stopColor="#e8e6df" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={contour} fill={`url(#${gradId})`} stroke="none" />
      <text
        x={cluster.cx}
        y={cluster.id === 'revenue' ? cluster.cy + cluster.ry - 10 : cluster.cy - cluster.ry + 18}
        textAnchor="middle"
        className="territory-label"
      >
        {cluster.label.toUpperCase()}
      </text>
    </g>
  )
}
