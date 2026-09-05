import { useNavigate } from '@tanstack/react-router'
import { claimNextHashScroll, scrollToAnchor } from './anchor-scroll'

/**
 * In-page anchors, made reliable.
 *
 * A router will not move for a location it is already on, so a second click on
 * the same link did nothing at all: land on /#install, scroll back up, press
 * Get Omarchy again and the page just sat there. These links are the page's
 * primary calls to action, so they scroll themselves and never depend on the
 * location having changed.
 *
 * The URL still goes through the router rather than straight into history.
 * The router owns this history stack and restores scroll positions from it,
 * so rewriting the address behind its back left it working from a location it
 * no longer had, and the page would jump somewhere unasked-for on the next
 * navigation. resetScroll is off because the scroll here is the one we want.
 */

/**
 * A click handler for a link to an anchor. On the page that holds it, it takes
 * over and scrolls; anywhere else it stands aside and lets the router
 * navigate, and the anchor is reached on arrival.
 */
export function useHashLink(hash: string) {
  const navigate = useNavigate()

  return (event: React.MouseEvent) => {
    // Anything but a plain left click is the reader asking for a new tab or a
    // saved link, and belongs to the browser.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    const target = document.getElementById(hash)
    if (!target) return

    event.preventDefault()
    // Honours the scroll-margin-top that holds the section clear of the bar.
    claimNextHashScroll()
    scrollToAnchor(target, true)
    // Replaced, not pushed: pressing the same button three times should not
    // put three entries in the reader's history.
    void navigate({ to: '/', hash, replace: true, resetScroll: false })
  }
}

/**
 * The click handler for the mark in the bar. Pressing it should always land
 * at the top of the home page - but a router will not move for a location it
 * is already on, so from anywhere down that page it did nothing at all, and
 * from another page scroll restoration could put you back wherever you last
 * were on it rather than at the top.
 */
export function useTopLink() {
  const navigate = useNavigate()

  return (event: React.MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    event.preventDefault()

    if (window.location.pathname === '/') {
      // Instant, not smooth. The anchors scroll because they are moving you
      // within a page you are reading; the mark is a way out, and gliding
      // three thousand pixels of scenery past on the way is not one.
      window.scrollTo({ top: 0, behavior: 'auto' })
      // Drops any #section from the address without a second scroll.
      void navigate({ to: '/', replace: true, resetScroll: false })
      return
    }
    void navigate({ to: '/' })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
}
