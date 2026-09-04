import { Link } from '@tanstack/react-router'
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
  return (
    <footer
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
