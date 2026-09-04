import { useEffect, useState, type ReactNode } from 'react'
import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'

import geistWoff2 from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url'
import monoWoff2 from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url'

import '../styles.css'
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
        // mask-image fetches CORS-anonymous; a preload without this is a
        // different credentials mode and the browser discards it.
        crossOrigin: 'anonymous',
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
  errorComponent: RootError,
  notFoundComponent: NotFoundHero,
  shellComponent: RootDocument,
})

function RootError({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : 'The page failed to render.'
  return (
    <main className="mx-auto max-w-xl px-4 py-24 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-text">
        Something broke
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-text-secondary [text-wrap:pretty]">
        {message}
      </p>
      <p className="mt-8">
        <Link
          to="/"
          className="text-sm font-medium text-brand underline decoration-border-strong underline-offset-3 hover:decoration-brand"
        >
          Back home
        </Link>
      </p>
    </main>
  )
}

function DevTools() {
  const [tools, setTools] = useState<ReactNode>(null)
  useEffect(() => {
    let cancelled = false
    void Promise.all([
      import('@tanstack/react-devtools'),
      import('@tanstack/react-router-devtools'),
    ]).then(([devtools, router]) => {
      if (cancelled) return
      setTools(
        <devtools.TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <router.TanStackRouterDevtoolsPanel />,
            },
          ]}
        />,
      )
    })
    return () => {
      cancelled = true
    }
  }, [])
  return tools
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <div className="relative z-10 min-h-dvh flex-1 bg-bg">{children}</div>
          <SiteFooter />
        </div>
        <ThemePicker />
        <SearchPalette />
        <PixelSnap />
        {import.meta.env.DEV ? <DevTools /> : null}
        <Scripts />
      </body>
    </html>
  )
}
