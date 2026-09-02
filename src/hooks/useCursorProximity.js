import { useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_RADIUS = 88

/**
 * Cursor in SVG space (rAF-throttled). Does not emit on every frame unless
 * the point changed; consumers derive nearest-node reaction from `cursor`.
 */
export function useCursorProximity(svgRef, nodes, { enabled = true, radius = DEFAULT_RADIUS } = {}) {
  const [cursor, setCursor] = useState(null)
  const rafRef = useRef(null)
  const pendingPoint = useRef(null)

  useEffect(() => {
    if (!enabled) {
      setCursor(null)
      return
    }
    const svg = svgRef.current
    if (!svg) return

    function toSvgPoint(clientX, clientY) {
      const pt = svg.createSVGPoint()
      pt.x = clientX
      pt.y = clientY
      const ctm = svg.getScreenCTM()
      if (!ctm) return null
      return pt.matrixTransform(ctm.inverse())
    }

    function flush() {
      rafRef.current = null
      if (pendingPoint.current) setCursor(pendingPoint.current)
    }

    function handleMove(e) {
      pendingPoint.current = toSvgPoint(e.clientX, e.clientY)
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(flush)
    }

    function handleLeave() {
      pendingPoint.current = null
      setCursor(null)
    }

    svg.addEventListener('mousemove', handleMove)
    svg.addEventListener('mouseleave', handleLeave)
    return () => {
      svg.removeEventListener('mousemove', handleMove)
      svg.removeEventListener('mouseleave', handleLeave)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [svgRef, enabled])

  const nearestId = useMemo(() => {
    if (!cursor) return null
    let best = null
    let bestDist = radius
    nodes.forEach((node) => {
      const dx = node.x - cursor.x
      const dy = node.y - cursor.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < bestDist) {
        bestDist = dist
        best = node.id
      }
    })
    return best
  }, [cursor, nodes, radius])

  return { cursor, nearestId }
}
