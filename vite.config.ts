import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { isPassthrough } from './scripts/site-passthrough.mjs'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * The checkout still has the old site's index.html at the project root, with
 * a <link> for every file under assets/css. Vite treats that HTML as an
 * entry and pulls those stylesheets into every page's SSR CSS, including
 * ten extra JetBrains Mono files and a second reset. Mark them external so
 * they stay files the old pages can request, not modules the redesign loads.
 */
function ignoreLegacySiteCss(): Plugin {
  return {
    name: 'ignore-legacy-site-css',
    enforce: 'pre',
    resolveId(source) {
      const id = source.split('?')[0].replace(/\\/g, '/')
      if (id.includes('/assets/css/') && id.endsWith('.css')) {
        return { id, external: true }
      }
    },
  }
}

/**
 * In development, the files the build would copy in from the omarchy-site
 * checkout - the theme screenshots, the manual's images, the photos beside
 * news posts, the installer scripts - are served from that checkout
 * directly, at the same addresses. Without this the page pointed at
 * /assets/themes/... and the dev server had never heard of it.
 */
function siteFiles(): Plugin {
  // The checkout named by OMARCHY_SITE_DIR; failing that, a sibling
  // omarchy-site checkout if there is one, which is how development runs
  // before the app lives in that repository; failing that, this repository.
  const site = path.resolve(
    process.env.OMARCHY_SITE_DIR ??
      (existsSync(path.resolve('../omarchy-site/CNAME'))
        ? '../omarchy-site'
        : '.'),
  )
  const types: Record<string, string> = {
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.xml': 'application/xml',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.woff2': 'font/woff2',
    '.mp4': 'video/mp4',
  }
  return {
    name: 'omarchy-site-files',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '/').split(/[?#]/)[0]
        if (!isPassthrough(pathname)) return next()
        let file = path.join(site, decodeURIComponent(pathname))
        if (!file.startsWith(site + path.sep)) return next()
        if (existsSync(file) && statSync(file).isDirectory()) {
          file = path.join(file, 'index.html')
        }
        if (!existsSync(file)) return next()
        res.setHeader(
          'Content-Type',
          types[path.extname(file)] ?? 'application/octet-stream',
        )
        createReadStream(file).pipe(res)
      })
    },
  }
}

function portedPages() {
  const pages = JSON.parse(
    readFileSync(new URL('./src/data/pages.json', import.meta.url), 'utf8'),
  ) as Record<string, unknown>
  return (
    Object.keys(pages)
      // Folded into /security/; the build writes a redirect page there instead.
      .filter((slug) => slug !== 'security/credits')
      .map((slug) => ({ path: `/${slug}/` }))
  )
}

function pluginPages() {
  const { plugins } = JSON.parse(
    readFileSync(new URL('./src/data/plugins.json', import.meta.url), 'utf8'),
  ) as { plugins: Array<{ id: string }> }
  return plugins.map((p) => ({ path: `/plugins/${p.id}/` }))
}

const config = defineConfig({
  // Bound to every interface, not just loopback: this is checked on a phone
  // on the same network as often as it is in a desktop browser, and passing
  // --host through whatever happens to launch vite proved unreliable.
  server: { host: true },
  resolve: { tsconfigPaths: true },
  plugins: [
    ignoreLegacySiteCss(),
    siteFiles(),
    devtools(),
    tailwindcss(),
    // The site ships as a folder of static files, the way omarchy.org is
    // hosted: every route is rendered at build time into dist/client, and
    // GitHub Pages uploads that folder. Server functions run at build time
    // too (see the static middleware on each), so a client-side navigation
    // reads a JSON file instead of calling a server that is not there.
    tanstackStart({
      prerender: {
        enabled: true,
        // Follow every link from the rendered pages, so each manual chapter,
        // news post, plugin and standalone page is found without a list.
        crawlLinks: true,
        concurrency: 8,
        failOnError: true,
        // Render only what the app owns. Everything else the crawl finds a
        // link to - the installer scripts, the Discord redirect, the badges
        // page, the feed - is a file omarchy.org already has, laid over the
        // output by scripts/assemble-static.mjs after this runs. Fetching
        // those from the app would be a 404 and a failed build.
        filter: ({ path }) => {
          // A query string never changes which file is written - the
          // prerenderer drops it from the output path - so every
          // /plugins/?q=... a tag links to would re-render /plugins/index.html
          // with that filter applied, and the last one crawled would win.
          // The default listing is the page; the browser applies the rest.
          if (path.includes('?')) return false
          const owned = [
            '/manual',
            '/news',
            '/plugins',
            '/themes',
            '/404',
            '/air',
            '/foundation',
            '/meetups',
            '/patrons',
            '/security',
            '/sponsorships',
            '/teams',
            '/workstations',
            '/potato',
            '/server',
            '/omakub',
            '/brand',
          ]
          const clean = path.split(/[?#]/)[0].replace(/\/$/, '')
          if (clean === '') return true
          // A file is never a page. The brand page links to its downloads,
          // and rendering the app at /brand/omarchy-logo.png would write a
          // page where a file belongs, for the assembly step to overwrite.
          // Named extensions, not "anything after a dot": plugin ids are
          // reverse-domain names, and /plugins/io.github.someone.thing/ is
          // very much a page.
          if (
            /\.(png|jpe?g|webp|gif|svg|ico|xml|json|txt|md|css|js|mjs|woff2?|mp4|pdf|zip|iso|html)$/i.test(
              clean,
            )
          )
            return false
          if (clean.startsWith('/patrons/badges')) return false
          if (clean === '/news/rss.xml') return false
          return owned.some((o) => clean === o || clean.startsWith(o + '/'))
        },
      },
      pages: [
        // GitHub Pages serves 404.html for any address it has no file for.
        // The /404/ route renders the not-found hero with a 200, so the
        // prerenderer accepts it, and the output lands where Pages looks.
        {
          path: '/404/',
          prerender: { enabled: true, outputPath: '/404.html' },
        },
        // Every plugin page, by name. The crawl only follows links, and the
        // listing's second page onward sits behind a query string the crawl
        // does not carry, so all but the first page's plugins would be left
        // unrendered. The catalogue knows them all.
        ...pluginPages(),
        // Every ported page, by name, for the same reason: a page nothing
        // links to - the potato page, the server teaser - is still a page
        // omarchy.org answers for, and the crawl alone would never reach it.
        ...portedPages(),
      ],
    }),
    viteReact(),
  ],
})

export default config
