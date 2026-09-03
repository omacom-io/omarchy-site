import { useEffect, useLayoutEffect, useRef } from 'react'
import {
  GRID_CLEAR_EVENT,
  GRID_EVENT,
  clearGridSnap,
  snapToGrid,
} from '@/lib/pixel-grid'
import type { PixelGrid } from '@/lib/pixel-grid'

/** Snapping measures text, so it must only ever run against the real
 * webfont; a snap against fallback metrics lands on different cell lines
 * and the correction reads as controls jumping around during load. */
const interReady = () => {
  try {
    return document.fonts.check('16px Inter')
  } catch {
    return true
  }
}

/**
 * Aligns [data-px-snap] elements to the hero field's lattice, under one
 * hard rule: a snap happens before a frame paints or not at all.
 *
 * Only mark elements that live and die with the hero. The lattice does, and
 * anything longer-lived is snapped on the home page and unsnapped everywhere
 * else, which the reader sees as the control jumping on arrival and again on
 * the way out. The bar's controls were marked and did exactly that; they take
 * their sizes from --pxc in plain CSS instead, which needs no measurement and
 * so cannot move. The
 * first snap runs in a layout effect before first paint when Inter is
 * cached, which is every visit after the first; on a cold cache the page
 * simply keeps its natural layout. Afterwards the only snaps are grid
 * events from the field, which fire inside its own pre-frame measure
 * (mount, resize), so they also land before the next paint. There are no
 * timers, no settle passes, and nothing that can move a control the
 * reader is already looking at.
 */
export function PixelSnap() {
  /** Set only if the pre-paint pass actually snapped. The field publishes its
   *  grid from an effect, which runs after the first paint, so honouring a
   *  grid event on a load that never snapped would move controls the reader is
   *  already looking at. That is the whole rule: before paint, or not at all
   *  for this load. Once armed it stays armed, so resizes still re-snap. */
  const armed = useRef(false)

  useLayoutEffect(() => {
    if (!interReady()) return
    const slot = document.querySelector('[data-hero-wordmark]')
    if (!slot) return
    const r = slot.getBoundingClientRect()
    if (r.width < 1) return
    snapToGrid({ x: r.left, y: r.top, cw: r.width / 81, ch: r.height / 19 })
    armed.current = true
  }, [])

  useEffect(() => {
    const onGrid = (event: Event) => {
      if (!armed.current) return
      snapToGrid((event as CustomEvent<PixelGrid>).detail)
    }
    const onClear = () => clearGridSnap()

    window.addEventListener(GRID_EVENT, onGrid)
    window.addEventListener(GRID_CLEAR_EVENT, onClear)
    return () => {
      window.removeEventListener(GRID_EVENT, onGrid)
      window.removeEventListener(GRID_CLEAR_EVENT, onClear)
      clearGridSnap()
    }
  }, [])

  return null
}
