import { createServerFn } from '@tanstack/react-start'
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'
import { loadNews, summarize } from './news'
import type { NewsPost } from './news'

export type ManualChapter = { slug: string; title: string; html: string }
export type { NewsPost, NewsSummary } from './news'
export type PortedPage = { title: string; html: string }

// All ported content stays server-side; routes receive one page at a time.

/**
 * A ported heading is its text followed by a link whose whole label is a "#".
 * That makes a four-pixel target out of the one thing on the line worth
 * linking to, and prints a hash after every heading in the manual whether or
 * not anyone is pointing at it. This turns the heading inside out: the link
 * takes the title, and the hash becomes a mark inside it that only shows on
 * hover. Done here rather than in the browser so the markup arrives finished.
 */
const HEADING_LINK =
  /<h([23])([^>]*)>([\s\S]*?)\s*<a class="manual__heading-link"([^>]*)>#<\/a><\/h\1>/g

/**
 * Every chapter's pagination footer links to /manual/toc, which the old site
 * served and this one does not - the manual index is the table of contents.
 * Left alone it is a 404 at the bottom of all fifty-one chapters.
 */
function retargetContentsLink(html: string) {
  return html.replace(/href="\/manual\/toc\/?"/g, 'href="/manual/"')
}

function foldHeadingLinks(html: string) {
  return html.replace(
    HEADING_LINK,
    (_whole, level: string, attrs: string, text: string, linkAttrs: string) =>
      `<h${level}${attrs}><a class="manual__heading-link"${linkAttrs}>${text}` +
      `<span class="manual__hash" aria-hidden="true">#</span></a></h${level}>`,
  )
}

/**
 * Just the chapter list. The manual's layout route loads this once and keeps
 * the sidebar mounted across every chapter, so the list is not rebuilt (and
 * its scrollbar does not restart its fade) when the route swaps between the
 * manual's opening page and a chapter.
 */
export const getManualToc = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])
  .handler(async () => {
    const mod = await import('../data/manual.json')
    const chapters = mod.default as Array<ManualChapter>
    return chapters.map(({ slug, title }) => ({ slug, title }))
  })

export const getManualChapter = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const mod = await import('../data/manual.json')
    const chapters = mod.default as Array<ManualChapter>
    const found = chapters.find((c) => c.slug === slug) ?? null
    const chapter = found
      ? { ...found, html: retargetContentsLink(foldHeadingLinks(found.html)) }
      : null
    const index = chapters.findIndex((c) => c.slug === slug)
    return {
      chapter,
      toc: chapters.map(({ slug: s, title }) => ({ slug: s, title })),
      prev:
        index > 0
          ? { slug: chapters[index - 1].slug, title: chapters[index - 1].title }
          : null,
      next:
        index >= 0 && index < chapters.length - 1
          ? { slug: chapters[index + 1].slug, title: chapters[index + 1].title }
          : null,
    }
  })

// News comes from omarchy.org's feed, not from a snapshot - see lib/news.

export const getNewsIndex = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])
  .handler(async () => summarize(await loadNews()))

export const getNewsPost = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const posts = await loadNews()
    return posts.find((p) => p.slug === slug) ?? null
  })

export const getPortedPage = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])
  .validator((path: string) => path)
  .handler(async ({ data: path }) => {
    const mod = await import('../data/pages.json')
    const pages = mod.default as Record<string, PortedPage>
    return pages[path] ?? null
  })

/* ------------------------------------------------------------------ search */

export type SearchEntry =
  | {
      kind: 'manual'
      slug: string
      title: string
      heading: string | null
      hash: string | null
      text: string
    }
  | {
      kind: 'news'
      slug: string
      year: string
      month: string
      title: string
      meta: string
      text: string
    }
  | { kind: 'plugin'; slug: string; title: string; meta: string; text: string }
  | { kind: 'theme'; slug: string; title: string; meta: string; text: string }

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  apos: "'",
  nbsp: ' ',
}

/** Markup to readable text. Only ever searched, never rendered as HTML. */
function strip(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#?\w+);/g, (whole, name: string) => ENTITIES[name] ?? whole)
    .replace(/\s+/g, ' ')
    .trim()
}

const HEADING = /<h([23])[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi

/**
 * A chapter is cut into sections at its headings rather than indexed whole. A
 * hit on "scratchpad" should offer the paragraph about scratchpads, not the
 * nine-thousand-word chapter around it, and every ported heading carries an
 * id, so each section can be linked to directly.
 */
function manualSections(chapter: ManualChapter): SearchEntry[] {
  const out: SearchEntry[] = []
  const html = chapter.html
  let cursor = 0
  let heading: string | null = null
  let hash: string | null = null

  const push = (end: number) => {
    const text = strip(html.slice(cursor, end))
    if (text) {
      out.push({
        kind: 'manual',
        slug: chapter.slug,
        title: chapter.title,
        heading,
        hash,
        text,
      })
    }
  }

  for (const match of html.matchAll(HEADING)) {
    push(match.index)
    // Ported headings carry a permalink anchor whose text is a bare "#".
    heading = strip(match[3]).replace(/\s*#\s*$/, '')
    hash = match[2]
    cursor = match.index + match[0].length
  }
  push(html.length)
  return out
}

/** The GitHub owner, which is the closest thing a theme has to an author. */
function owner(repo: string) {
  try {
    return new URL(repo).pathname.split('/').filter(Boolean)[0] ?? 'community'
  } catch {
    return 'community'
  }
}

/** The parts of the index that come from the bundled snapshots, split
 *  around where the news goes so the order of kinds stays as it was. */
let fixed: { manual: SearchEntry[]; rest: SearchEntry[] } | null = null

function newsEntries(posts: Array<NewsPost>): SearchEntry[] {
  return posts.map((post) => ({
    kind: 'news',
    slug: post.slug,
    year: post.year,
    month: post.month,
    title: post.title,
    meta: post.dateStr,
    text: strip(post.html),
  }))
}

/**
 * One index for the whole site, built here rather than in the browser.
 *
 * The plugin catalogue alone is 3.2MB on disk; almost all of it is release
 * metadata, verification state and image URLs that nobody searches by. What
 * crosses the wire is a name, an author, a category and a handful of tags per
 * plugin - and for the manual and the news, the prose itself, because those
 * are the two places where the words you remember are in the body rather than
 * the title. The snapshot-backed parts are built once per process and held;
 * the news is re-read from the feed's cache on each call, so a post published
 * an hour ago is searchable without a deploy.
 */
export const getSearchIndex = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])
  .handler(async () => {
    const news = newsEntries(await loadNews())
    if (fixed) return [...fixed.manual, ...news, ...fixed.rest]

    const [manual, plugins, themes] = await Promise.all([
      import('../data/manual.json'),
      import('../data/plugins.json'),
      import('../data/themes.json'),
    ])

    const manualPart: SearchEntry[] = []
    for (const chapter of manual.default as Array<ManualChapter>) {
      manualPart.push(...manualSections(chapter))
    }

    const built: SearchEntry[] = []

    const catalogue = (
      plugins.default as { plugins: Array<Record<string, unknown>> }
    ).plugins
    for (const plugin of catalogue) {
      built.push({
        kind: 'plugin',
        slug: String(plugin.id),
        title: String(plugin.name),
        meta: [plugin.category, plugin.author].filter(Boolean).join(' · '),
        // No description: a plugin is found by its name, and 1952 of them
        // would be most of the payload.
        text: [
          plugin.category,
          plugin.author,
          ...((plugin.tags as string[] | undefined) ?? []),
        ]
          .filter(Boolean)
          .join(' '),
      })
    }

    for (const theme of themes.default as Array<{
      name: string
      repo: string
    }>) {
      built.push({
        kind: 'theme',
        slug: theme.name,
        title: theme.name,
        meta: owner(theme.repo),
        text: owner(theme.repo),
      })
    }

    fixed = { manual: manualPart, rest: built }
    return [...manualPart, ...news, ...built]
  })
