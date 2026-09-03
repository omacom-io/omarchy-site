/**
 * The hero field's lattice, published by the canvas so DOM controls sitting
 * over it can align themselves to the same grid. GRID_EVENT fires with
 * { x, y, cw, ch } in CSS px (client coords at measure time) whenever the
 * field's geometry changes; GRID_CLEAR_EVENT fires when the hero unmounts.
 */
export const GRID_EVENT = 'omarchy-pixel-grid'
export const GRID_CLEAR_EVENT = 'omarchy-pixel-grid-clear'

export type PixelGrid = { x: number; y: number; cw: number; ch: number }

/**
 * Translates every [data-px-snap] element onto the nearest cell line.
 * Position only, applied before the frame paints: nothing here resizes or
 * reflows anything, so a snap can never cascade into further layout
 * movement, and a page that never snaps is simply the natural layout.
 * Earlier versions also rounded box sizes to whole cells; the reflow that
 * caused fed back into the grid itself and showed up as the navbar
 * settling through several visibly different states on load.
 */
export function snapToGrid(grid: PixelGrid) {
  const els = [...document.querySelectorAll<HTMLElement>('[data-px-snap]')]
  if (els.length === 0) return

  // Buttons carry transition-all, which would animate the translate and
  // turn measurement into a moving target; freeze, snap, restore.
  for (const el of els) {
    el.style.transition = 'none'
    el.style.transform = ''
  }
  for (const el of els) {
    const r = el.getBoundingClientRect()
    const dx =
      Math.round((r.left - grid.x) / grid.cw) * grid.cw + grid.x - r.left
    // Mode "x" snaps horizontally only: navbar items keep their natural
    // vertical centering so the bar's own axis can never break.
    const dy =
      el.dataset.pxSnap === 'x'
        ? 0
        : Math.round((r.top - grid.y) / grid.ch) * grid.ch + grid.y - r.top
    el.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`
  }
  requestAnimationFrame(() => {
    for (const el of els) el.style.transition = ''
  })
}

/** Removes everything snapToGrid applied. */
export function clearGridSnap() {
  for (const el of document.querySelectorAll<HTMLElement>('[data-px-snap]')) {
    el.style.transform = ''
    el.style.transition = ''
  }
}
