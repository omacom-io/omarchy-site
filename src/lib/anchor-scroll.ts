import type { AnyRouter } from '@tanstack/react-router'

/**
 * Hash scrolling. Only arrivals are placed here - never back or forward,
 * where scroll restoration puts the reader wherever they actually were.
 */

/** Whether the reader asked for less movement. */
const still = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Where the anchor asks to be: its own top, held clear of the bar by the
 *  scroll-margin the stylesheet already gives every [id]. */
const anchorTop = (el: Element) => {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
  return el.getBoundingClientRect().top + window.scrollY - margin
}

export function scrollToAnchor(el: Element, smooth: boolean) {
  window.scrollTo({
    top: Math.max(0, anchorTop(el)),
    behavior: smooth && !still() ? 'smooth' : 'auto',
  })
}

/** A caller about to run its own anchor scroll - the smooth in-page links -
 *  says so, and the navigation it also issues is then left alone instead of
 *  being finished a second time with an instant jump. */
let claimed = false
export function claimNextHashScroll() {
  claimed = true
}

/**
 * Watch every way a hash scroll happens - a router navigation, a plain
 * in-page anchor, the browser's own jump on a full load. The router's own
 * hash scrolling is switched off, so this is the one place that decides
 * where a hash puts the page. The reader outranks all of it: any wheel,
 * key, or touch ends the watching, and the scroll is theirs.
 */
export function watchHashScrolls(router: AnyRouter) {
  // Back and forward are scroll restoration's to place, not ours. popstate
  // cannot tell them apart from an anchor click - browsers fire it for every
  // same-document navigation - but restoration itself can: it only has a
  // position saved for a location it has already seen. A location it knows
  // is a return, and the reader goes back to wherever they stood, footer
  // included if that is where they were; one it has never seen is an
  // arrival, and arrivals are placed here.
  const restorable = () => {
    try {
      const state = window.history.state as { __TSR_key?: string } | null
      // Only the entry key counts. It is unique per history entry, so a
      // saved position under it really means this same entry was stood on
      // before - a reload or a back. Keying by the address here would match
      // any future arrival at that URL: an anchor click makes a fresh,
      // state-less entry at an address that may well have been visited
      // before, and deferring on that left the click uncorrected.
      if (!state?.__TSR_key) return false
      const cache = JSON.parse(
        sessionStorage.getItem('tsr-scroll-restoration-v1_3') ?? '{}',
      ) as Record<string, unknown>
      return Boolean(cache[state.__TSR_key])
    } catch {
      return false
    }
  }

  let frame = 0
  let settle = 0
  const stop = () => {
    cancelAnimationFrame(frame)
    clearInterval(settle)
  }
  for (const type of ['wheel', 'touchstart', 'keydown', 'mousedown']) {
    window.addEventListener(type, stop, { passive: true })
  }

  /**
   * Put the page where the current hash says, once its element exists.
   * Owning placements scroll there outright; load-time ones leave the
   * browser's own jump unless it missed. The position is then held for a
   * moment against a late re-jump.
   */
  const place = (own: boolean) => {
    if (restorable()) return
    if (claimed) {
      claimed = false
      return
    }
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return
    stop()
    // The page a hash points into can mount a moment after the navigation
    // resolves, so the element is waited for - briefly, in case it simply
    // does not exist.
    let tries = 30
    const attempt = () => {
      const el = document.getElementById(id)
      if (!el) {
        if (tries-- > 0) frame = requestAnimationFrame(attempt)
        return
      }
      const top = Math.max(0, anchorTop(el))
      if (own) window.scrollTo({ top })
      let holds = 12
      settle = window.setInterval(() => {
        if (holds-- <= 0) return clearInterval(settle)
        const want = Math.max(0, anchorTop(el))
        if (Math.abs(window.scrollY - want) > 1) {
          window.scrollTo({ top: want })
        }
      }, 100)
    }
    frame = requestAnimationFrame(attempt)
  }

  router.subscribe('onResolved', (event) => {
    // The initial resolve is not a navigation; the load path below handles
    // it, with restoration taken into account.
    if (event.fromLocation) place(true)
  })
  window.addEventListener('hashchange', () => place(true))

  // A full load with a hash: the browser jumps by itself. A reload that
  // restoration has a saved place for is already covered - place() defers to
  // it - so these can simply run.
  place(false)
  window.addEventListener('load', () => place(false), { once: true })
}
