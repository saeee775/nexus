const SLOTS = [
  { id: 'top', dx: 0, dy: -90 },
  { id: 'top-right', dx: 124, dy: -74 },
  { id: 'right', dx: 138, dy: 4 },
  { id: 'bottom-right', dx: 124, dy: 78 },
  { id: 'bottom', dx: 0, dy: 96 },
  { id: 'bottom-left', dx: -124, dy: 78 },
  { id: 'left', dx: -138, dy: 4 },
  { id: 'top-left', dx: -124, dy: -74 },
]

function intersects(a, b, pad = 6) {
  return (
    a.x < b.x + b.w + pad &&
    a.x + a.w + pad > b.x &&
    a.y < b.y + b.h + pad &&
    a.y + a.h + pad > b.y
  )
}

function inBounds(box, bounds) {
  return (
    box.x >= bounds.x &&
    box.y >= bounds.y &&
    box.x + box.w <= bounds.x + bounds.w &&
    box.y + box.h <= bounds.y + bounds.h
  )
}

/**
 * Collision-aware placement of floating metric fragments around a node.
 * Tries eight compass slots; hides lower-priority items rather than overlapping
 * the node, other annotations, major nodes, or the viewport.
 */
export function placeAnnotations({ origin, items, obstacles, bounds }) {
  const placed = []
  const occupied = []

  const sorted = [...items].sort((a, b) => (b.priority || 0) - (a.priority || 0))

  for (const item of sorted) {
    let best = null
    let bestScore = -Infinity

    for (const slot of SLOTS) {
      const box = {
        x: origin.x + slot.dx - item.w / 2,
        y: origin.y + slot.dy - item.h / 2,
        w: item.w,
        h: item.h,
      }
      if (!inBounds(box, bounds)) continue

      let penalty = 0
      let blocked = false
      for (const obs of obstacles) {
        if (!intersects(box, obs, obs.pad ?? 8)) continue
        if ((obs.priority || 0) >= (item.priority || 0)) {
          blocked = true
          break
        }
        penalty += 50 + (obs.priority || 0)
      }
      if (blocked) continue

      for (const occ of occupied) {
        if (intersects(box, occ, 10)) {
          blocked = true
          break
        }
      }
      if (blocked) continue

      const preferTop = slot.id.startsWith('top') ? 8 : 0
      const score = 120 - penalty - Math.abs(slot.dx) * 0.04 + preferTop
      if (score > bestScore) {
        bestScore = score
        best = { ...item, dx: slot.dx, dy: slot.dy, slot: slot.id }
      }
    }

    if (best) {
      placed.push(best)
      occupied.push({
        x: origin.x + best.dx - item.w / 2,
        y: origin.y + best.dy - item.h / 2,
        w: item.w,
        h: item.h,
      })
    }
  }

  return placed
}

export { SLOTS }
