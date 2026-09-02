const SCATTER = [
  { a: 12, d: 0.38 }, { a: 48, d: 0.92 }, { a: 86, d: 0.58 },
  { a: 128, d: 1.05 }, { a: 168, d: 0.44 }, { a: 208, d: 0.88 },
  { a: 248, d: 0.62 }, { a: 292, d: 1.0 }, { a: 328, d: 0.5 },
  { a: 355, d: 0.78 },
]

export default function CustomerCohort({ r, healthColor, isSelected, ringColor, reducedMotion = false }) {
  return (
    <g className="cohort-cluster">
      {SCATTER.map((p, i) => {
        const rad = (p.a * Math.PI) / 180
        const dist = p.d * (r + 4)
        const cx = Math.cos(rad) * dist
        const cy = Math.sin(rad) * dist
        const size = 1.8 + (i % 3) * 0.85
        return (
          <circle
            key={i}
            className={reducedMotion ? '' : 'cohort-particle'}
            cx={cx}
            cy={cy}
            r={size}
            fill={i % 3 === 0 ? (isSelected ? ringColor : healthColor) : 'var(--text-secondary)'}
            opacity={i % 3 === 0 ? 0.9 : 0.45}
            style={
              reducedMotion
                ? undefined
                : { '--p-dur': `${7 + (i % 4)}s`, '--p-delay': `${i * -0.6}s` }
            }
          />
        )
      })}
    </g>
  )
}
