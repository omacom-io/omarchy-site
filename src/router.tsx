import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { watchHashScrolls } from './lib/anchor-scroll'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    // omarchy.org's URLs end in a slash, and GitHub Pages serves a
    // prerendered folder that way; every link and match follows suit.
    trailingSlash: 'always',
    scrollRestoration: true,
    // Hash scrolling is owned by watchHashScrolls below, which caps every
    // jump where the footer's reveal begins; two scrollers racing for the
    // same landing is how the loser's position wins.
    defaultHashScrollIntoView: false,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  })

  // Hash scrolls near the end of a page clamp into the footer's reveal;
  // this pulls them back out. Scroll is a window concern, so the server
  // has no part in it.
  if (typeof document !== 'undefined') watchHashScrolls(router)

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
