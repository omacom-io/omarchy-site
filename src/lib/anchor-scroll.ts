import type { AnyRouter } from '@tanstack/react-router'

/**
 * Anchor jumps, kept out of the footer's reveal.
 *
 * The footer is pinned to the bottom of the window and covered by the content
 * layer; the last viewport-height of scroll is the content sliding up off it.
 * A plain anchor jump does not know that. Scrolling a heading to the top of
 * the window when less than a screen of content follows it, the browser
 * clamps to the end of the document - which here means straight into the
 * reveal: half the screen fills with footer nobody asked for, and the heading
 * that was asked for is pushed off the top. So every hash-driven scroll is
 * capped where the reveal begins: as close to the top as the heading can get
 * without lifting the page off the footer.
 *
 * Only hash scrolls are handled, and only on arrivals - never on back or
 * forward, where scroll restoration is putting the reader wherever they
 * actually were, footer included if that is where they stood.
 */

/** Whether the reader asked for less movement. */
const still = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The highest scroll position that keeps the content layer covering the
 * pinned footer. The reveal sentinel closes that layer, but the layer itself
 * can be stretched taller than its content - a short page still has to cover
 * the footer - so the reveal begins at the layer's bottom edge, not at the
 * sentinel.
 */
const revealCap = () => {
  const sentinel = document.querySelector('[data-reveal-sentinel]')
  const layer = sentinel?.parentElement
  if (!layer) return Infinity
  const revealStart = layer.getBoundingClientRect().bottom + window.scrollY
  return Math.max(0, revealStart - window.innerHeight)
}

/** Where the anchor asks to be: its own top, held clear of the bar by the
 *  scroll-margin the stylesheet already gives every [id]. */
const anchorTop = (el: Element) => {
  const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0
  return el.getBoundingClientRect().top + window.scrollY - margin
}

/** Scroll to an anchor, stopping short of the reveal. */
export function scrollToAnchor(el: Element, smooth: boolean) {
  window.scrollTo({
    top: Math.min(anchorTop(el), revealCap()),
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
 * in-page anchor, the browser's own jump on a full load - and place the page
 * at the capped position. The router's own hash scrolling is switched off, so
 * this is the one place that decides where a hash puts the page; the browser
 * cannot be switched off, so its jumps are corrected instead, and watched for
 * a moment after, because it is willing to re-run one late, whenever the
 * content it was looking for streams in. The reader outranks all of it: any
 * wheel, key, or touch ends the watching, and the scroll is theirs.
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
      // before, and deferring on that left the click uncorrected, clamped
      // into the reveal with the heading pushed off the top.
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
   * Put the page where the current hash says, once its element exists. Owning
   * placements scroll to the cap outright; correcting ones only pull the page
   * back if something else has already scrolled it into the reveal. Either
   * way the position is then held for a moment against a late re-jump.
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
      const cap = revealCap()
      if (own || window.scrollY > cap) {
        window.scrollTo({ top: Math.min(anchorTop(el), cap) })
      }
      let holds = 12
      settle = window.setInterval(() => {
        if (holds-- <= 0) return clearInterval(settle)
        const capNow = revealCap()
        if (window.scrollY > capNow + 1) {
          window.scrollTo({ top: Math.min(anchorTop(el), capNow) })
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

  // A full load with a hash: the browser jumps by itself, into the reveal if
  // the target is near the end, and is only corrected. A reload that
  // restoration has a saved place for is already covered - place() defers to
  // it - so these can simply run.
  place(false)
  window.addEventListener('load', () => place(false), { once: true })
}
