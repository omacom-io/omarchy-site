import { Link } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { OmarchyWordmark } from '@/components/Brand'
import { PixelBackdrop } from '@/components/HeroShader'
import {
  CloudflareMark,
  ThirtySevenSignalsMark,
} from '@/components/PartnerLogos'
import { OPEN_PICKER_EVENT } from '@/lib/theme'
import release from '@/data/version.json'

const columns = [
  {
    title: 'Explore',
    links: [
      { label: 'Manual', to: '/manual/' },
      { label: 'Plugins', to: '/plugins/' },
      { label: 'Themes', to: '/themes/' },
      { label: 'News', to: '/news/' },
      { label: 'Download the ISO', href: release.isoUrl },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Discord', href: 'https://discord.gg/tXFUdasqhY' },
      { label: 'Meetups', splat: 'meetups' },
      { label: 'Teams', splat: 'teams' },
      { label: 'Artists in Residence', splat: 'air' },
      { label: 'Workstations', splat: 'workstations' },
    ],
  },
  {
    title: 'Foundation',
    links: [
      { label: 'Omacom Foundation', splat: 'foundation' },
      { label: 'Patrons', splat: 'patrons' },
      { label: 'Sponsorships', splat: 'sponsorships' },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'GitHub', href: 'https://github.com/omacom/omarchy' },
      { label: 'Security', splat: 'security' },
      { label: 'Brand', splat: 'brand' },
      {
        label: 'Merch',
        href: 'https://supply.37signals.com/collections/omarchy',
      },
      { label: 'Omakub', splat: 'omakub' },
    ],
  },
] as const

export function SiteFooter() {
  const footer = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = footer.current
    if (!el) return
    const sentinel = document.querySelector<HTMLElement>(
      '[data-reveal-sentinel]',
    )
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let height = 0
    let pinned = false
    let idle = 0
    /** Where the scroll says the reveal is, and where it has eased to. */
    let target = 0
    let shown = 0
    let frame = 0

    /** 0 while the page still covers the footer, 1 once it is all uncovered. */
    const progress = () => {
      if (!sentinel || height <= 0) return 1
      const view = document.documentElement.clientHeight
      const covered = sentinel.getBoundingClientRect().top
      return Math.min(1, Math.max(0, (view - covered) / height))
    }

    const paint = () => {
      const p = pinned && !still ? shown : 1
      el.style.setProperty('--reveal', p.toFixed(4))
      // Rounded to a quarter of a pixel. A blur radius that changes by an
      // arbitrary fraction on every frame re-rasterises the footer for a
      // difference nobody can see; a quarter pixel out of five is twenty
      // steps, which no eye reads as steps.
      const blur = Math.round((1 - p) * 5 * 4) / 4
      el.style.setProperty('--reveal-blur', `${blur.toFixed(2)}px`)
    }

    /**
     * The reveal is eased in time, not read straight off the scroll.
     *
     * The whole of it happens across the footer's own height - about four
     * notches of a mouse wheel - so taken literally it arrives in four jumps,
     * which is what made it read as a handful of fixed states rather than a
     * fade. Chasing the target instead lets a coarse input still produce a
     * continuous ramp, and costs nothing on a trackpad, where the target
     * moves smoothly and this simply follows it.
     */
    const tick = () => {
      const gap = target - shown
      if (Math.abs(gap) < 0.0005) {
        shown = target
        frame = 0
        paint()
        return
      }
      shown += gap * 0.25
      paint()
      frame = requestAnimationFrame(tick)
    }

    const chase = () => {
      target = pinned && !still ? progress() : 1
      if (!frame) frame = requestAnimationFrame(tick)
    }

    // Pinned only where it fits. A footer taller than the window would keep
    // its own top edge permanently above it, which is a phone in portrait and
    // a short window on a narrow desktop - measured rather than guessed at
    // with a breakpoint, since the height depends on how the columns wrap.
    const measure = () => {
      height = el.getBoundingClientRect().height
      pinned = height <= document.documentElement.clientHeight - 24
      el.classList.toggle('footer-pinned', pinned)
      // A resize is not a reveal: land on the new value rather than easing to
      // it, or the footer fades while the window is being dragged.
      target = pinned && !still ? progress() : 1
      shown = target
      paint()
    }

    // Left part way open, it goes the rest of the way itself once the scroll
    // stops, rather than resting at whatever fraction a flick happened to end
    // on. The smooth scroll feeds this handler too, so it simply finds itself
    // at a boundary next time round and does nothing.
    //
    // Weighted towards opening rather than split down the middle: under a
    // third of the way reads as not having gone, and anything past that as
    // having meant to. Half asked for a deliberate push every time.
    const SHUT_BELOW = 0.3
    const settle = () => {
      if (!pinned || still || !sentinel) return
      const p = progress()
      if (p <= 0.02 || p >= 0.98) return
      const view = document.documentElement.clientHeight
      const top =
        window.scrollY +
        sentinel.getBoundingClientRect().top -
        view +
        (p < SHUT_BELOW ? 0 : height)
      window.scrollTo({ top, behavior: 'smooth' })
    }

    const onScroll = () => {
      chase()
      window.clearTimeout(idle)
      idle = window.setTimeout(settle, 140)
    }

    measure()
    const sizes = new ResizeObserver(measure)
    sizes.observe(el)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(idle)
      sizes.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <footer
      ref={footer}
      className="relative isolate overflow-hidden border-t border-border-subtle"
      style={{
        // The field paints this itself; declared here so the ground is
        // already right for the frame before the canvas warms up.
        background: 'var(--t-field-bg)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <PixelBackdrop className="footer-rise" />

      <div className="footer-rise relative mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          {/* Wide enough to hold "Incubated at 37signals, makers of Basecamp
              and HEY" on one line; at 20rem it broke with "and HEY" alone on
              the second. */}
          <div className="max-w-sm">
            {/* The same handle as the hero's wordmark: it opens the picker,
                and hovering lifts it to the exact colour the hero's pixels
                rise to, since that is the tint the field itself uses for a
                hovered logo. */}
            <button
              type="button"
              aria-label="Omarchy: change the theme"
              onClick={() =>
                window.dispatchEvent(new CustomEvent(OPEN_PICKER_EVENT))
              }
              data-quiet
              className="group block cursor-pointer"
            >
              <OmarchyWordmark className="h-6 w-auto text-brand transition-colors duration-150 ease-out group-hover:text-(--t-field-hover)" />
            </button>
            <p
              data-quiet
              className="mt-4 text-sm leading-relaxed text-text-muted"
            >
              <span className="block">
                Beautiful, fun &amp; opinionated Linux by{' '}
                <a
                  href="https://dhh.dk"
                  className="text-text-secondary hover:text-text"
                >
                  DHH
                </a>
                .
              </span>
              <span className="block">
                The malleable OS for the age of agents.
              </span>
            </p>

            {/* Who is behind it and who carries it: attribution belongs with
                the identity, not down in the fine print with the legal. */}
            <div className="mt-5 flex flex-col gap-2 text-[13px] text-text-muted [text-wrap:pretty]">
              <p data-quiet>
                Incubated at{' '}
                <a
                  href="https://37signals.com"
                  className="inline-flex items-center gap-[3px] pl-px align-middle text-text-secondary hover:text-text"
                >
                  <ThirtySevenSignalsMark className="size-4 shrink-0" />
                  37signals
                </a>
                , makers of{' '}
                <a
                  href="https://basecamp.com"
                  className="text-text-secondary hover:text-text"
                >
                  Basecamp
                </a>{' '}
                and{' '}
                <a
                  href="https://hey.com"
                  className="text-text-secondary hover:text-text"
                >
                  HEY
                </a>
              </p>
              <p data-quiet>
                Sponsored hosting by{' '}
                <a
                  href="https://cloudflare.com"
                  className="inline-flex items-center gap-[5px] pl-px align-middle text-text-secondary hover:text-text"
                >
                  <CloudflareMark className="h-3 w-auto shrink-0" />
                  Cloudflare
                </a>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {columns.map((col) => (
              <nav key={col.title} data-quiet aria-label={col.title}>
                <h2 className="font-sans text-xs tracking-widest text-text-muted uppercase">
                  {col.title}
                </h2>
                <ul className="mt-3.5 flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {'splat' in link ? (
                        <Link
                          to="/$/"
                          params={{ _splat: link.splat }}
                          className="text-sm text-text-secondary transition-colors duration-150 ease-out hover:text-text"
                        >
                          {link.label}
                        </Link>
                      ) : 'to' in link ? (
                        <Link
                          to={link.to}
                          className="text-sm text-text-secondary transition-colors duration-150 ease-out hover:text-text"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          className="text-sm text-text-secondary transition-colors duration-150 ease-out hover:text-text"
                        >
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* The fine print, and only the fine print. */}
        <div className="mt-12 flex flex-col gap-2 border-t border-border-subtle pt-6 text-[13px] text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p data-quiet>
            <Link
              to="/$/"
              params={{ _splat: 'brand' }}
              className="text-text-secondary hover:text-text"
            >
              Omarchy is a pending trademark
            </Link>
          </p>
          <p data-quiet>
            Partner inquiries:{' '}
            <a
              href="mailto:david@omarchy.org"
              className="text-text-secondary hover:text-text"
            >
              david@omarchy.org
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
