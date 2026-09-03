import { createServerFn } from '@tanstack/react-start'
import { staticFunctionMiddleware } from '@tanstack/start-static-server-functions'

import { DEFAULT_QUERY, listPlugins, toCatalogueEntry } from './plugin-filter'
import type { Engagement } from './plugin-filter'

export type Plugin = {
  id: string
  name: string
  description: string
  author: string | null
  category: string
  kind: string | null
  tags: Array<string>
  stars: number
  version: string | null
  verified: boolean
  verificationStatus: string | null
  verificationCoverage: string | null
  verificationSnapshotStatus: string | null
  sourceType: 'community' | 'builtin'
  builtIn: boolean
  placeholder: boolean
  repo: string | null
  sourceUrl: string | null
  repositoryLayout: string | null
  installAvailable: boolean
  installCommand: string
  installNote: string
  status: string | null
  license: string | null
  addedAt: string | null
  listedAt: string | null
  updatedAt: string | null
  repositoryRelease: { tag?: string; url?: string } | null
  listingValidatedCommit: string | null
  listingValidatedAt: string | null
  listingValidatedBranch: string | null
  upstreamCheckStatus: string | null
  upstreamCheckedAt: string | null
  upstreamObservedCommit: string | null
  upstreamObservedBranch: string | null
  upstreamValidatedCommit: string | null
  thumb: string | null
  thumbW: number | null
  thumbH: number | null
  image: string | null
  accent: string | null
  initials: string | null
}

export type {
  CatalogueEntry,
  Engagement,
  PluginQuery,
  PluginSort,
  PluginSource,
} from './plugin-filter'
export { PAGE_SIZE } from './plugin-filter'

export type PluginWithStats = Plugin & { stats: Engagement }

// The full catalog (1,850+ entries) stays on the server; the client only ever
// receives one filtered page at a time through the server functions below.
async function loadCatalog(): Promise<Array<Plugin>> {
  const mod = await import('../data/plugins.json')
  return (mod.default as { plugins: Array<Plugin> }).plugins
}

/**
 * Live engagement stats (views / copies / hearts) from the marketplace's
 * public stats API. The endpoint is CORS-locked for browsers but freely
 * fetchable server-side; cached in-process for five minutes so a page of
 * traffic costs one upstream request. Falls back to zeros when unreachable.
 */
const STATS_URL = 'https://api.omarchyplugins.com/v1/stats'
const STATS_TTL_MS = 5 * 60 * 1000
const ZERO_STATS: Engagement = { views: 0, copies: 0, hearts: 0 }

let statsCache: { at: number; data: Record<string, Engagement> } | null = null

async function loadStats(): Promise<Record<string, Engagement>> {
  if (statsCache && Date.now() - statsCache.at < STATS_TTL_MS) {
    return statsCache.data
  }
  try {
    const res = await fetch(STATS_URL, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) throw new Error(String(res.status))
    const body = (await res.json()) as {
      plugins?: Record<string, Partial<Engagement>>
    }
    const data: Record<string, Engagement> = {}
    for (const [id, s] of Object.entries(body.plugins ?? {})) {
      data[id] = {
        views: Number(s.views ?? 0),
        copies: Number(s.copies ?? 0),
        hearts: Number(s.hearts ?? 0),
      }
    }
    statsCache = { at: Date.now(), data }
    return data
  } catch {
    // Keep serving a stale snapshot if we have one; otherwise zeros.
    return statsCache?.data ?? {}
  }
}

function withStats(
  plugins: Array<Plugin>,
  stats: Record<string, Engagement>,
): Array<PluginWithStats> {
  return plugins.map((p) => ({ ...p, stats: stats[p.id] ?? ZERO_STATS }))
}

/**
 * The listing as it first appears - the default query's first page, with
 * the counts and categories the controls need. Rendered into the page at
 * build time, so /plugins/ arrives complete; anything the reader changes
 * after that is answered in the browser, from the catalogue below.
 */
export const getPluginsOverview = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])
  .handler(async () => {
    const [all, stats] = await Promise.all([loadCatalog(), loadStats()])
    return listPlugins(
      withStats(all, stats).map(toCatalogueEntry),
      DEFAULT_QUERY,
    )
  })

/**
 * The whole catalogue, trimmed to what a card shows and a filter reads.
 * Built once, cached as a static file, fetched by the listing the first
 * time a reader touches a control - after which every search, sort and
 * page is computed where they are, with no round trip at all.
 */
export const getCatalogue = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])
  .handler(async () => {
    const [all, stats] = await Promise.all([loadCatalog(), loadStats()])
    return withStats(all, stats).map(toCatalogueEntry)
  })

export const getPlugin = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const [all, stats] = await Promise.all([loadCatalog(), loadStats()])
    const plugin = all.find((p) => p.id === id) ?? null
    if (!plugin) {
      return { plugin: null, related: [] as Array<PluginWithStats> }
    }
    const related = withStats(
      all
        .filter(
          (p) =>
            p.id !== id &&
            p.sourceType === plugin.sourceType &&
            (p.category === plugin.category ||
              p.tags.some((t) => plugin.tags.includes(t))),
        )
        .sort((a, b) => b.stars - a.stars)
        .slice(0, 4),
      stats,
    )
    return { plugin: withStats([plugin], stats)[0], related }
  })

export const getPluginHighlights = createServerFn({ method: 'GET' })
  .middleware([staticFunctionMiddleware])
  .handler(async () => {
    const [all, stats] = await Promise.all([loadCatalog(), loadStats()])
    const top = withStats(
      all
        .filter((p) => p.thumb && p.sourceType === 'community')
        .sort((a, b) => b.stars - a.stars)
        .slice(0, 6),
      stats,
    ).map(toCatalogueEntry)
    return { top, total: all.length }
  })
