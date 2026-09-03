import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import '@fontsource-variable/geist'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/jetbrains-mono/wght-italic.css'
import geistWoff2 from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url'
import monoWoff2 from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url'

import appCss from '../styles.css?url'
import { themeInitScript } from '@/lib/theme'
import { OG_IMAGE, SITE_DESCRIPTION } from '@/lib/seo'
import { SiteHeader } from '@/components/SiteHeader'
import { NotFoundHero } from '@/components/NotFoundHero'
import { SiteFooter } from '@/components/SiteFooter'
import { ThemePicker } from '@/components/ThemePicker'
import { SearchPalette } from '@/components/SearchPalette'
import { PixelSnap } from '@/components/PixelSnap'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: 'Omarchy - Beautiful, fun & opinionated Linux by DHH' },
      { name: 'description', content: SITE_DESCRIPTION },
      // Inherited by every page. Anything page-specific - title, description,
      // url, canonical - is set by the route itself through seo(), which
      // overrides these by property name.
      { property: 'og:site_name', content: 'Omarchy' },
      { property: 'og:locale', content: 'en_US' },
      { property: 'og:title', content: 'Omarchy' },
      { property: 'og:description', content: SITE_DESCRIPTION },
      { property: 'og:type', content: 'website' },
      { property: 'og:image', content: OG_IMAGE.url },
      { property: 'og:image:width', content: OG_IMAGE.width },
      { property: 'og:image:height', content: OG_IMAGE.height },
      { property: 'og:image:alt', content: OG_IMAGE.alt },
      // Without this X renders a bare link rather than a card; with it the
      // image runs the full width of the tweet.
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: OG_IMAGE.url },
      { name: 'twitter:image:alt', content: OG_IMAGE.alt },
      // A starting value only - Tokyo Night's background, for the moment
      // before hydration. From then on paintChrome() keeps it on whatever
      // colour the page is actually showing that strip, section by section.
      { name: 'theme-color', content: '#1a1b26' },
    ],
    scripts: [{ children: themeInitScript }],
    links: [
      { rel: 'stylesheet', href: appCss },
      // The wordmark is the largest thing above the fold on the home page.
      {
        rel: 'preload',
        href: '/brand/omarchy-wordmark.svg',
        as: 'image',
        type: 'image/svg+xml',
      },
      {
        rel: 'preload',
        href: geistWoff2,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: monoWoff2,
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
    ],
  }),
  notFoundComponent: NotFoundHero,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          {/* The page rides over the footer rather than pushing it ahead: the
              footer is stuck to the bottom of the window the whole way down,
              and this is what hides it, so it needs a ground of its own
              rather than the one the canvas paints behind everything. The
              sentinel marks where the reveal begins, for anything that wants
              to know whether the footer is actually on screen. */}
          {/* At least a window tall, even when the page is not: this layer is
              also the lid on the pinned footer, and a short page - the
              foundation, a thin manual chapter - would otherwise leave the
              footer showing through under its content from the moment it
              loads, before the reader has scrolled anywhere. */}
          <div className="relative z-10 min-h-dvh flex-1 bg-bg">
            {children}
            {/* Pinned to the layer's bottom edge rather than left in flow:
                the layer can be stretched taller than its content on a short
                page, and the reveal begins where the layer ends, not where
                the content ran out. */}
            <div
              data-reveal-sentinel
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0"
            />
          </div>
          <SiteFooter />
        </div>
        <ThemePicker />
        <SearchPalette />
        <PixelSnap />
        {import.meta.env.DEV ? (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
