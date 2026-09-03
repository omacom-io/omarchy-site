import { createFileRoute } from '@tanstack/react-router'
import { NotFoundHero } from '@/components/NotFoundHero'
import { seo } from '@/lib/seo'

/**
 * The not-found page as a page of its own. GitHub Pages serves 404.html for
 * any address it has no file for, and the prerenderer refuses to write a
 * page that answers with a 404 status - so the hero the router shows for an
 * unmatched path is also rendered here, at a real route with a real 200, and
 * the build writes it to /404.html.
 */
export const Route = createFileRoute('/404')({
  head: () =>
    seo({
      title: 'Not found - Omarchy',
      description: 'There is nothing at this address.',
      path: '/404/',
    }),
  component: NotFoundHero,
})
