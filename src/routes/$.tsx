import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { getPortedPage } from '@/lib/content'
import { SITE_DESCRIPTION, excerptFromHtml, seo } from '@/lib/seo'
import { cn } from '@/lib/utils'

/**
 * Serves every standalone page ported from omarchy.org: /air, /foundation,
 * /meetups, /patrons, /security, /security/credits, /sponsorships, /teams,
 * /workstations, /potato, /server, /omakub, /brand. Unknown paths 404.
 */
/**
 * The pages ported from omarchy.org are a title and a body of HTML, and
 * neither works as a social card on its own. Their titles are page headings
 * ("Runs great on ancient hardware", "#omarchy-workstations") and two
 * different pages both call themselves "The Omacom Foundation"; their first
 * paragraphs are as often a list of names or a single sponsorship as they
 * are a summary. The set is small, fixed and known, so it is written out.
 *
 * Anything not listed still falls back to the page's own title and first
 * paragraph, which is right for a page added later and never revisited.
 */
const PORTED: Partial<Record<string, { title: string; description: string }>> =
  {
    air: {
      title: 'Artists in Residence - Omarchy',
      description:
        'A six-month residency for artists who make Omarchy beautiful: themes, plugins, and whatever else. Up to five seats at any one time, supported by the Omacom Foundation.',
    },
    brand: {
      title: 'Brand - Omarchy',
      description:
        'The Omarchy wordmark and logo, as vectors and at 4096px, and the terms for using them. Omarchy is a pending trademark.',
    },
    foundation: {
      title: 'The Omacom Foundation - Omarchy',
      description:
        'The nonprofit behind Omarchy. It holds the trademarks, funds the infrastructure, promotes the work, and supports the open-source projects and developers it is built on.',
    },
    meetups: {
      title: 'Meetups - Omarchy',
      description:
        'Omarchy meetups around the world, and how to run your own: about Omarchy, Linux and adjacent hacker culture, open to everyone, and run by the community.',
    },
    omakub: {
      title: 'Omakub - Omarchy',
      description:
        'The road to Omarchy started with Omakub, which proved the thesis: give developers a beautiful, complete Linux out of the box and they show up.',
    },
    patrons: {
      title: 'Patrons - Omarchy',
      description:
        'The people and companies funding the Omacom Foundation. Founding patrons contribute $1,000,000 to the mission; distinguished patrons, $100,000.',
    },
    potato: {
      title: 'Ancient Hardware - Omarchy',
      description: 'Omarchy runs great on ancient hardware.',
    },
    security: {
      title: 'Security - Omarchy',
      description:
        'How to report a vulnerability in Omarchy - tell the Security Team privately at security@omarchy.org - and the people credited for doing exactly that.',
    },
    server: {
      title: 'Server - Omarchy',
      description: 'Omarchy Server 4.0, coming in 2026.',
    },
    sponsorships: {
      title: 'Sponsorships - Omarchy',
      description:
        'How the Omacom Foundation funds the projects Omarchy is built on, starting with an exclusive three-year sponsorship of Hyprland.',
    },
    teams: {
      title: 'Teams - Omarchy',
      description:
        'The people guiding Omarchy: Core sets the direction, Security keeps the system safe, and the Rangers help everyone else find their way.',
    },
    workstations: {
      title: 'Workstations - Omarchy',
      description:
        'Desks and machines running Omarchy, shared under #omarchy-workstations.',
    },
  }

/** The pages that read best on the news column's measure: prose and short
 *  lists, no galleries or member grids to give the room to. */
const NARROW = new Set([
  'server',
  'meetups',
  'air',
  'foundation',
  'sponsorships',
  'security',
  'brand',
  'omakub',
])

export const Route = createFileRoute('/$')({
  loader: async ({ params }) => {
    const path = (params._splat ?? '').replace(/\/+$/, '')
    // One security page: the credits are a single short section, and a page
    // of their own gave them nothing but a second footer link. The old
    // address forwards, so nothing saved or shared goes dark.
    if (path === 'security/credits') {
      throw redirect({
        to: '/$/',
        params: { _splat: 'security' },
        hash: 'credits',
      })
    }
    const page = await getPortedPage({ data: path })
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- eslint mis-narrows the server-fn return here; tsc sees PortedPage | null
    if (!page) throw notFound()
    if (path === 'security') {
      const credits = await getPortedPage({ data: 'security/credits' })
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- same server-fn mis-narrowing as above
      if (credits) {
        return {
          ...page,
          // The prose's own "security credits" link points where the page
          // used to live; on the merged page that is just the section below.
          html: `${page.html.replaceAll('href="/security/credits/"', 'href="#credits"')}<div id="credits">${credits.html}</div>`,
        }
      }
    }
    return page
  },
  head: ({ loaderData, params }) => {
    const path = (params._splat ?? '').replace(/\/+$/, '')
    const written = PORTED[path]
    return seo({
      title: written?.title ?? `${loaderData?.title ?? 'Omarchy'} - Omarchy`,
      description:
        written?.description ??
        ((loaderData && excerptFromHtml(loaderData.html)) || SITE_DESCRIPTION),
      path: `/${path}`,
    })
  },
  component: PortedPage,
})

function PortedPage() {
  const page = Route.useLoaderData()
  const { _splat } = Route.useParams()
  const narrow = NARROW.has((_splat ?? '').replace(/\/+$/, ''))

  return (
    <main
      className={cn(
        'mx-auto px-4 py-12 sm:px-6',
        narrow ? 'max-w-3xl' : 'max-w-6xl',
      )}
    >
      <h1 className="text-3xl font-semibold tracking-tight text-text">
        {page.title}
      </h1>
      <div
        className="prose ported mt-8"
        dangerouslySetInnerHTML={{ __html: page.html }}
      />
    </main>
  )
}
