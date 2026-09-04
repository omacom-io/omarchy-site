import { Link, useLocation } from '@tanstack/react-router'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { GithubIcon, MenuBarsIcon, SearchIcon } from '@/components/icons'
import { OmarchyMark } from '@/components/Brand'
import { Button } from '@/components/ui/button'
import { useHashLink, useTopLink } from '@/lib/hash-scroll'
import { THEME_EVENT, groundOf } from '@/lib/theme'
import { OPEN_SEARCH_EVENT } from '@/lib/search'
import { useIsNarrow } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

const navLinks = [
  { to: '/manual/', label: 'Manual' },
  { to: '/plugins/', label: 'Plugins' },
  { to: '/themes/', label: 'Themes' },
  { to: '/news/', label: 'News' },
] as const

/**
 * One header, always the same content: the glyph, the nav, GitHub, and
 * Install. The only thing scrolling changes is the surface, transparent
 * over the home hero and, past it, the colour of whatever section it is
 * sitting on, so nothing appears,
 * disappears, or moves as you cross the boundary. The name never renders
 * as text; the glyph is the identity.
 */
/**
 * Whether a hero still covers the bar. The bar and its blended ghost both read
 * this, so they can never disagree about which state they are in.
 *
 * Which pages have a hero is a question for the DOM, not for the router. The
 * home page has one; so does the 404, at whatever address someone mistyped,
 * and the router reports nothing about that - a mistyped path resolves to the
 * catch-all route and its match says `success`, or `pending`, and never that
 * it threw. What every one of them does have is the sentinel, so that is what
 * is watched. `seed` only decides the very first paint, before any of this
 * has run, which is the one thing the DOM cannot answer in time.
 */
/**
 * Before the paint, not after it. This chooses which of two label layers is
 * painted, so settling it in a passive effect leaves one frame where the bar
 * is still in the state the previous page left it in: arriving on a page with
 * no hero, that frame has the bar blended with no ghost behind it to fill the
 * labels in, and they vanish. A layout effect runs after the DOM is in place
 * and before anything is drawn, which is exactly when this can be known and
 * still be acted on in time. It does not run on the server, which is what the
 * seed is for.
 */
const useBeforePaint =
  typeof document === 'undefined' ? useEffect : useLayoutEffect

function useHeroInView(seed: boolean) {
  const [heroInView, setHeroInView] = useState(seed)

  useBeforePaint(() => {
    let observer: IntersectionObserver | null = null
    let sizeWatcher: ResizeObserver | null = null
    let settling = 0
    /** The sentinel currently being observed - the element, not the route.
     *  On a client-side navigation the pathname changes before the DOM does:
     *  the outgoing page is still mounted, so an effect keyed on the route
     *  attaches to the outgoing page's sentinel, and when that node is
     *  removed a moment later its observer fires one last time with
     *  isIntersecting false. That false was permanent - the route never
     *  changes again, so nothing re-attached, and the bar arrived at every
     *  hero page unblended. Tracking the element makes the swap visible:
     *  the live sentinel is no longer the watched one, so watch it instead.
     */
    let watched: Element | null = null

    // The same question the observer answers, asked directly: is the hero's
    // bottom edge still below the bar's? Asking it at once matters because
    // the answer is needed on the first frame, and an observer's first
    // callback is not guaranteed to have arrived by then - or at all, while
    // the tab is not being rendered. The observer then keeps it current.
    //
    // null where nothing has been laid out: an unrendered tab measures every
    // box at zero, and zero is not "the hero has scrolled away", it is "no
    // one has asked yet". Answering it would put the bar in the wrong state
    // with no second measurement coming to correct it.
    const covers = (hero: Element, bar: Element) => {
      const barBox = bar.getBoundingClientRect()
      if (barBox.height === 0) return null
      return hero.getBoundingClientRect().bottom > barBox.height
    }

    /**
     * Take the measurement, and if there is nothing to measure yet, come back
     * for it. Bounded, because a tab that is never rendered never lays
     * anything out and would otherwise be asked forever; the observer is
     * still watching either way, and answers as soon as it is shown.
     */
    const settle = (hero: Element, bar: Element, tries = 3) => {
      const covered = covers(hero, bar)
      if (covered !== null) {
        setHeroInView(covered)
        return
      }
      if (tries > 0)
        settling = requestAnimationFrame(() => settle(hero, bar, tries - 1))
    }

    const watch = (hero: Element, bar: Element) => {
      observer?.disconnect()
      // The moment to swap is when the bar's bottom edge meets the hero's,
      // which is the one border the hero and the section under it share.
      // Inset the root by the bar's measured height so the two edges are
      // compared directly: hardcoding it went off by the bar's border, and
      // by a whole row on the narrow layout where the nav wraps under.
      const height = bar.getBoundingClientRect().height
      observer = new IntersectionObserver(
        ([entry]) => setHeroInView(entry.isIntersecting),
        { rootMargin: `-${height}px 0px 0px 0px` },
      )
      observer.observe(hero)
    }

    /**
     * Point everything at whatever sentinel the page has right now. A no-op
     * while the watched one is still the live one; a teardown-and-reattach
     * the moment it is not, whether the page swapped its hero for another or
     * for nothing. Disconnecting the old observer first also discards any
     * report it has queued about the node that just left.
     */
    const sync = () => {
      const hero = document.querySelector('[data-hero-sentinel]')
      if (hero === watched) return
      observer?.disconnect()
      sizeWatcher?.disconnect()
      cancelAnimationFrame(settling)
      watched = hero
      const bar = document.querySelector('header')
      if (!hero || !bar) {
        // Nothing over the bar right now - which is the right answer both on
        // a page with no hero and on one whose chunk is still loading, since
        // the arrivals watcher below re-runs this when a hero does mount.
        setHeroInView(false)
        return
      }
      settle(hero, bar)
      watch(hero, bar)
      // The bar grows a second row of links on narrow screens, so the edge
      // it is measured against moves with the layout.
      sizeWatcher = new ResizeObserver(() => watch(hero, bar))
      sizeWatcher.observe(bar)
    }

    // Every arrival and departure funnels through sync, which is what lets
    // this run once for the life of the header instead of once per route:
    // the DOM says when the hero changes, and the DOM is what is being
    // watched, so there is nothing for the route to add.
    const arrivals = new MutationObserver(sync)
    arrivals.observe(document.body, { childList: true, subtree: true })
    sync()

    return () => {
      cancelAnimationFrame(settling)
      observer?.disconnect()
      sizeWatcher?.disconnect()
      arrivals.disconnect()
    }
  }, [])

  return heroInView
}

/**
 * How solid the bar's surface should be, 0 to 1. It starts filling in the
 * moment the bar's top edge reaches the bottom of the hero's buttons, and is
 * fully opaque exactly where it used to appear all at once: when the bar's
 * bottom edge meets the hero's, the border those two sections share.
 *
 * The value is written to a CSS variable rather than React state, so a scroll
 * costs one style write instead of a re-render, and the anchors are measured
 * once per layout rather than on every frame.
 */
function useNavSurface(
  /** An open sheet needs a bar under it wherever it happens to be. */
  sheetOpen: boolean,
  /** The blended ghost is up behind the bar, so the real labels stand aside. */
  blended: boolean,
  bar: RefObject<HTMLElement | null>,
  flat: boolean,
  /** Re-surveyed on arrival at a new page, whose sections are its own. */
  pathname: string,
) {
  useEffect(() => {
    const el = bar.current
    if (!el) return

    // Exactly one of the two label layers is ever painted. They are never
    // cross-faded: two copies of the same word at partial opacity, one blended
    // and one not, read as hollow, embossed text rather than as a label.
    const solid = (on: boolean) => {
      // One attribute on the bar, which a stylesheet rule reads, rather than
      // an inline colour on each label. The server can render it, so the
      // first paint is already the state this would have settled into: it
      // used to take until the effect ran, and for those frames both layers
      // of every label were painted at once.
      if (on) el.removeAttribute('data-nav-blend')
      else el.setAttribute('data-nav-blend', '')
      const ghost = document.querySelector<HTMLElement>('[data-nav-ghost]')
      if (ghost) ghost.style.opacity = on ? '0' : '1'
    }

    // A phone has no bar: no fill, nothing to fade in, the way it looks at the
    // top of the page all the way down it. The controls carry their own ground
    // instead, so there is something behind them and not behind the whole
    // width of the screen.
    if (flat) {
      el.style.setProperty('--nav-surface', '0')
      solid(!blended)
      return
    }

    /**
     * Where each of the page's grounds begins and ends, and what colour it is.
     * The hero is left out: the blended ghost lives over it and the bar stays
     * bare all the way down it.
     */
    type Ground = { top: number; bottom: number; colour: string }
    let grounds: Ground[] = []
    let height = 0
    /** The <main> the last survey read. The route changes before the DOM
     *  does, so the one mounted when this effect runs may be the outgoing
     *  page's; comparing identities is how the swap is noticed. */
    let surveyed: Element | null = null
    /** Whether the mounted page has a hero. Over a hero the bar goes bare
     *  and the blended ghost carries the labels; a page without one has no
     *  such moment, and the bar always wears at least the page's own
     *  ground - a bar that is transparent for the first few dozen pixels of
     *  scroll reads as content sliding under a pane of nothing. */
    let heroUp = false
    // Asked, not waited for. Arriving on a page with the pointer already over
    // the bar - which is what clicking a link in it does - no pointerenter
    // ever fires, because nothing crossed the boundary. The bar would sit in
    // its blended state under a pointer that was already there, and the ghost
    // would go on painting labels through a hover chip it was never
    // compensated against, which is to say invisibly.
    let hovering = el.matches(':hover')

    const survey = () => {
      // Keep the size watcher pointed at whichever <main> is actually
      // mounted; the one this effect started with may already be gone.
      const main = document.querySelector('main')
      if (main !== surveyed) {
        surveyed = main
        sizes.disconnect()
        if (main) sizes.observe(main)
      }
      heroUp = document.querySelector('[data-hero-sentinel]') !== null
      height = el.getBoundingClientRect().height
      // Sections, plus any band inside one that paints its own ground and
      // marks itself as such - "See it in action" is a full-bleed strip of
      // its own colour living inside the section above it, and to the bar it
      // is a section like any other. In document order, so a nested one is
      // always found after the section holding it.
      const sections = document.querySelectorAll<HTMLElement>(
        'main > section, main [data-ground]',
      )
      const nodes = sections.length
        ? [...sections]
        : [...document.querySelectorAll<HTMLElement>('main')]

      const footer = document.querySelector<HTMLElement>('footer')
      if (footer) nodes.push(footer)

      grounds = nodes
        .filter((node) => !node.hasAttribute('data-hero-sentinel'))
        .map((node) => {
          const box = node.getBoundingClientRect()
          return {
            top: box.top + window.scrollY,
            bottom: box.bottom + window.scrollY,
            colour: groundOf(node) ?? 'var(--color-bg)',
          }
        })
      return grounds.length > 0
    }

    /**
     * The bar carries a section's colour only while it is wholly inside that
     * section: from the moment its own top edge meets the section's top, to
     * the moment its bottom edge meets the section's bottom. Outside that -
     * which is exactly while a boundary is crossing it - it carries nothing.
     *
     * Both switches happen at the instant the fill and the thing behind it are
     * the same colour, so neither is visible. What you see instead is a bar
     * that hides the page sliding under it, and lets a section edge pass
     * through in the open.
     *
     * Cheap enough to run straight from the scroll event: it reads scrollY,
     * which costs no layout, and compares it against numbers taken once.
     */
    /** The innermost ground at a point down the page, or none. */
    const groundAt = (y: number) => {
      let found: Ground | null = null
      for (const g of grounds) if (y >= g.top && y < g.bottom) found = g
      return found
    }

    const paint = () => {
      const y = window.scrollY
      // Whole rule, in one line: the bar is coloured when its top edge and
      // its bottom edge are in the same ground, and bare when they are not.
      const top = groundAt(y)
      const here = top && top === groundAt(y + height) ? top : null
      // Nothing to say while the sheet is down: the bar paints as the top of
      // the sheet then, from a class, not from the page behind it.
      if (here) el.style.setProperty('--nav-ground', here.colour)
      else if (!heroUp) el.style.setProperty('--nav-ground', 'var(--color-bg)')
      el.style.setProperty('--nav-surface', here || !heroUp ? '1' : '0')
      // The ghost holds the labels for as long as it is up, and hovering hands
      // them over early: it sits under the bar and cannot answer a pointer.
      solid(sheetOpen || !blended || hovering)
    }

    const onEnter = () => {
      hovering = true
      paint()
    }
    const onLeave = () => {
      hovering = false
      paint()
    }

    const relayout = () => {
      survey()
      paint()
    }

    // Arriving at /#install, the page is moved to the anchor by whatever
    // handles the hash, which may be before this attaches - and a scroll that
    // has already happened sends no event to catch up on. One more pass once
    // the current task is done reads wherever the page actually ended up.
    const settle = window.setTimeout(relayout, 0)

    // Sections grow as images and fonts land, which moves every edge below.
    // survey() points this at the mounted <main>, and re-points it when the
    // page under the bar is swapped for another.
    const sizes = new ResizeObserver(relayout)

    // The page mounts async on a client-side navigation, so wait for it.
    let probe = 0
    const wait = () => {
      if (survey()) {
        paint()
        return
      }
      probe = requestAnimationFrame(wait)
    }
    wait()

    // A survey taken while the outgoing page was still mounted read that
    // page's sections, and painted the bar for a page that was about to
    // leave. The swap is a DOM event, not a route event - the route already
    // changed - so the DOM says when to look again.
    const arrivals = new MutationObserver(() => {
      if (document.querySelector('main') !== surveyed) relayout()
    })
    arrivals.observe(document.body, { childList: true, subtree: true })

    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    window.addEventListener('scroll', paint, { passive: true })
    window.addEventListener('resize', relayout)
    // Each ground's colour is read once and held, so a theme has to say when
    // it has changed or the bar keeps the last one until the next scroll.
    window.addEventListener(THEME_EVENT, relayout)
    return () => {
      cancelAnimationFrame(probe)
      window.clearTimeout(settle)
      arrivals.disconnect()
      sizes.disconnect()
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('scroll', paint)
      window.removeEventListener('resize', relayout)
      window.removeEventListener(THEME_EVENT, relayout)
    }
  }, [sheetOpen, blended, bar, flat, pathname])
}

export function SiteHeader() {
  const { pathname } = useLocation()
  // Seeded with the one page the server can be sure about, then handed over
  // to the sentinel.
  const heroInView = useHeroInView(pathname === '/')
  const [menuOpen, setMenuOpen] = useState(false)
  const installLink = useHashLink('install')
  const homeLink = useTopLink()
  const narrow = useIsNarrow()
  const transparent = heroInView
  // Past the hero there is no blended ghost to carry the controls and no bar
  // behind them, so on a phone they take the same ground a press gives them.
  // With the sheet open the bar has a surface again and they do not need one.
  const chip = narrow && !menuOpen && !transparent

  // Following a link or hitting Escape closes it; leaving it open across a
  // navigation would cover the page you just asked for.
  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])
  const bar = useRef<HTMLDivElement>(null)
  // The ramp runs for the whole of the home page, not only while the hero is
  // still in view. Past the hero its own geometry already resolves to a full
  // surface, and gating it on the observer meant nothing was listening to the
  // scroll up there: pressing the mark jumped to the top and the bar kept its
  // background until the observer noticed the hero and rebuilt the ramp, a
  // few frames later. An open sheet still gets its bar back - a menu hanging
  // off nothing, with the page running up between it and the logo, reads as a
  // mistake.
  useNavSurface(menuOpen, transparent, bar, narrow && !menuOpen, pathname)

  const glyph = (
    <Link
      to="/"
      aria-label="Omarchy home"
      onClick={homeLink}
      className="flex items-center"
    >
      <OmarchyMark className="size-[22px] shrink-0 text-brand lg:size-[calc(var(--pxc)*2)]" />
    </Link>
  )

  const search = (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Search Omarchy"
      data-nav-glyph
      className="relative h-8 w-10 text-text-secondary transition-[background-color,transform] hover:text-text before:absolute before:-inset-1 lg:h-[calc(var(--pxr)*3)]"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT))}
    >
      <SearchIcon className="size-5" />
    </Button>
  )

  const install = (
    <Button
      className="relative h-8 px-3 before:absolute before:-inset-y-1.5 lg:h-[calc(var(--pxr)*3)] lg:w-[calc(var(--pxc)*6)]"
      nativeButton={false}
      onClick={installLink}
      render={<Link to="/" hash="install" />}
    >
      Install
    </Button>
  )

  return (
    <header className="pixel-container sticky top-0 z-(--z-nav)">
      {/* The surface fades in across the scroll between the hero's buttons
          and the hero's bottom edge, rather than switching on at one point.
          --nav-surface carries the progress; everything that makes the bar a
          bar reads from it, so they arrive together. */}
      <div
        ref={bar}
        // Over the hero the blended ghost holds the labels from the first
        // frame, so the real ones start out of the way.
        data-nav-blend={transparent ? '' : undefined}
        // With the sheet down, the bar is the top of the sheet and wears its
        // ground rather than the section's: taking a colour from the page
        // behind it would put a seam across the one surface being looked at.
        className={cn(menuOpen && 'bg-bg/95 backdrop-blur-lg')}
        style={{
          // On the bar rather than the header, so both the surface it paints
          // and the height the hooks measure include the strip above it.
          paddingTop: 'env(safe-area-inset-top)',
          // Fully opaque once it has a surface, and in the section's own
          // colour, so the bar stops reading as a panel over the page and
          // starts reading as the top of whatever is under it. A translucent
          // fill would let the copy scrolling beneath tint it and give the
          // match away; there is nothing to blur behind an opaque layer
          // either, so the filter that used to sit here is gone.
          backgroundColor: menuOpen
            ? undefined
            : 'color-mix(in oklch, var(--nav-ground, var(--color-bg)) calc(var(--nav-surface, 0) * 100%), transparent)',
        }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          {glyph}

          <nav aria-label="Main" className="hidden items-center sm:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="px-3 py-1.5 text-sm whitespace-nowrap text-text-secondary transition-[background-color] duration-150 ease-out hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                activeProps={{ className: 'text-text bg-surface-2' }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <div className="hidden items-center sm:flex">
              {search}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Omarchy on GitHub"
                data-nav-glyph
                className="relative h-8 w-10 text-text-secondary transition-[background-color,transform] hover:text-text before:absolute before:-inset-1 lg:h-[calc(var(--pxr)*3)]"
                nativeButton={false}
                render={<a href="https://github.com/omacom/omarchy" />}
              >
                <GithubIcon className="size-5" />
              </Button>
              <span className="ml-3 flex">{install}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              data-nav-toggle
              className={cn(
                'relative size-8 text-text-secondary transition-[background-color,transform] hover:text-text before:absolute before:-inset-1 sm:hidden',
                chip && 'bg-surface-2',
              )}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              aria-label={menuOpen ? 'Close menu' : 'Menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MenuBarsIcon open={menuOpen} className="size-[22px]" />
            </Button>
          </div>
        </div>
      </div>
      {/* Tapping the page behind the sheet closes it. The header is an
          inline-size container, so it is the containing block for fixed
          children as well - bottom-0 would resolve to the bar's own 56px, and
          the scrim is sized explicitly instead. */}
      {menuOpen ? (
        <div
          data-menu-scrim
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
          className="absolute inset-x-0 top-(--nav-h) h-svh bg-bg/40 sm:hidden"
        />
      ) : null}

      {/* Overlaid, not stacked: pushing the page down would change the bar's
          height and with it the hero's offsets. */}

      <div
        id="site-menu"
        hidden={!menuOpen}
        className="absolute inset-x-0 top-(--nav-h) border-b border-border-subtle bg-bg/95 backdrop-blur-lg sm:hidden"
      >
        <nav
          aria-label="Main pages"
          className="mx-auto flex max-w-6xl flex-col px-4 py-2"
        >
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="py-3 text-[15px] text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              activeProps={{ className: 'text-text font-medium' }}
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false)
              window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT))
            }}
            className="flex items-center gap-2.5 py-3 text-left text-[15px] text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <SearchIcon className="size-5" />
            Search Omarchy
          </button>
          <div className="mt-2 flex items-center gap-2.5 border-t border-border-subtle pt-4 pb-2">
            <Button
              className="flex-1"
              nativeButton={false}
              onClick={(event) => {
                setMenuOpen(false)
                installLink(event)
              }}
              render={<Link to="/" hash="install" />}
            >
              Install
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Omarchy on GitHub"
              nativeButton={false}
              render={<a href="https://github.com/omacom/omarchy" />}
            >
              <GithubIcon className="size-5" />
            </Button>
          </div>
        </nav>
      </div>
    </header>
  )
}

/**
 * The blended half of the bar, rendered inside the hero so it shares a
 * stacking context with the pixel canvas. The real header cannot do this
 * itself: it is sticky, sticky always forms a stacking context, and
 * mix-blend-mode inside one has no backdrop to blend against, which is why
 * the bar used to look identical whether or not a lit pixel was behind it.
 *
 * Fixed rather than absolute, so it tracks the sticky bar as the hero scrolls
 * under it. Inert to pointers and to screen readers, and it carries only the
 * labels: the mark and Install keep their own colours and stay with the real
 * header. Colours are pre-compensated (--t-hdr-*), so over the plain field
 * background the difference resolves back to the authored colour and nothing
 * looks different until a pixel actually passes behind.
 */
export function HeroNavGhost() {
  // It does not decide for itself whether the hero is still up. It used to,
  // with a second copy of the watcher the bar uses, and two copies of a
  // watcher are two answers: they were seen reporting opposite things in the
  // same millisecond, which left the bar blended and the labels that fill it
  // hidden. The bar's own effect writes this node's opacity as part of
  // choosing which of the two label layers is painted, so the question is
  // asked once, in one place, and this only has to be here to be filled in.
  return (
    <div
      aria-hidden="true"
      data-nav-ghost
      className="pointer-events-none fixed inset-x-0 top-0 z-(--z-nav) mix-blend-difference"
      // opacity is declared, not left to the stylesheet, because the header
      // hydrates before the hero does and its effect writes this very
      // property onto this node in between; without it here React finds an
      // inline opacity it never rendered and reports a hydration mismatch.
      style={{ paddingTop: 'env(safe-area-inset-top)', opacity: 1 }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        {/* Holds the mark's slot without painting it */}
        <span className="flex items-center">
          <span className="block size-[22px] shrink-0 lg:size-[calc(var(--pxc)*2)]" />
        </span>

        <span className="hidden items-center sm:flex">
          {navLinks.map((link) => (
            <span
              key={link.to}
              className="px-3 py-1.5 text-sm whitespace-nowrap"
              style={{ color: 'var(--t-hdr-text-2)' }}
            >
              {link.label}
            </span>
          ))}
        </span>

        <span className="ml-auto flex items-center gap-2.5">
          <span
            className="hidden items-center sm:flex"
            style={{ color: 'var(--t-hdr-text-2)' }}
          >
            <span className="flex h-8 w-10 items-center justify-center lg:h-[calc(var(--pxr)*3)]">
              <SearchIcon className="size-5" />
            </span>
            <span className="flex h-8 w-10 items-center justify-center lg:h-[calc(var(--pxr)*3)]">
              <GithubIcon className="size-5" />
            </span>
            {/* Install holds its own colours, so the ghost only holds its
                place - same box, same type metrics, nothing painted. */}
            <span
              aria-hidden="true"
              className="ml-3 h-8 px-3 text-sm font-medium lg:h-[calc(var(--pxr)*3)] lg:w-[calc(var(--pxc)*6)]"
              style={{ color: 'transparent' }}
            >
              Install
            </span>
          </span>

          <span
            className="flex size-8 items-center justify-center sm:hidden"
            style={{ color: 'var(--t-hdr-text-2)' }}
          >
            <MenuBarsIcon className="size-[22px]" />
          </span>
        </span>
      </div>
    </div>
  )
}
