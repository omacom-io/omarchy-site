/**
 * Filtering and sorting the plugin catalogue - in the browser.
 *
 * On a server this ran per request over the full 3.6MB catalogue, one page
 * of results at a time. A static site has no per-request anything, and the
 * search box's inputs are unbounded, so no build could cache every answer.
 * The listing fetches a trimmed catalogue once instead - the fields a card
 * shows and a filter reads, about 0.9MB, 200KB over the wire - and this
 * module does the rest where the reader is. Pure functions, no imports that
 * only exist on a server.
 */

export type Engagement = { views: number; copies: number; hearts: number }

/** What a card shows and a filter or sort reads. The full record, with its
 *  verification history and install details, stays on the plugin's page. */
export type CatalogueEntry = {
  id: string
  name: string
  description: string
  author: string | null
  category: string
  kind: string | null
  tags: Array<string>
  stars: number
  verified: boolean
  sourceType: 'community' | 'builtin'
  builtIn: boolean
  addedAt: string | null
  updatedAt: string | null
  thumb: string | null
  thumbW: number | null
  thumbH: number | null
  accent: string | null
  initials: string | null
  stats: Engagement
}

export type PluginSort =
  'stars' | 'recent' | 'updated' | 'name' | 'views' | 'copies' | 'hearts'

export type PluginSource = 'community' | 'builtin'

export type PluginQuery = {
  q: string
  category: string
  sort: PluginSort
  verified: boolean
  source: PluginSource
  page: number
}

export const PAGE_SIZE = 24

export const DEFAULT_QUERY: PluginQuery = {
  q: '',
  category: 'all',
  sort: 'stars',
  verified: false,
  source: 'community',
  page: 1,
}

export function filterPlugins<T extends CatalogueEntry>(
  all: Array<T>,
  query: PluginQuery,
): Array<T> {
  let result = all.filter((p) => p.sourceType === query.source)

  if (query.verified) {
    result = result.filter((p) => p.verified)
  }
  if (query.category !== 'all') {
    result = result.filter(
      (p) => p.category === query.category || p.tags.includes(query.category),
    )
  }
  if (query.q.trim()) {
    const terms = query.q.trim().toLowerCase().split(/\s+/)
    result = result.filter((p) => {
      const haystack =
        `${p.name} ${p.description} ${p.author ?? ''} ${p.tags.join(' ')} ${p.kind ?? ''}`.toLowerCase()
      return terms.every((t) => haystack.includes(t))
    })
  }

  const sorted = [...result]
  switch (query.sort) {
    case 'stars':
      sorted.sort((a, b) => b.stars - a.stars)
      break
    case 'recent':
      sorted.sort((a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? ''))
      break
    case 'updated':
      sorted.sort((a, b) =>
        (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
      )
      break
    case 'name':
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'views':
      sorted.sort((a, b) => b.stats.views - a.stats.views)
      break
    case 'copies':
      sorted.sort((a, b) => b.stats.copies - a.stats.copies)
      break
    case 'hearts':
      sorted.sort((a, b) => b.stats.hearts - a.stats.hearts)
      break
  }
  return sorted
}

export type PluginListing<T extends CatalogueEntry = CatalogueEntry> = {
  items: Array<T>
  total: number
  page: number
  pageCount: number
  categories: Array<string>
  counts: { community: number; builtin: number }
}

/** One page of a query's results, with what the controls around it need. */
export function listPlugins<T extends CatalogueEntry>(
  all: Array<T>,
  query: PluginQuery,
): PluginListing<T> {
  const filtered = filterPlugins(all, query)
  const total = filtered.length
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(Math.max(1, query.page), pageCount)
  const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const inSource = all.filter((p) => p.sourceType === query.source)
  const categories = [...new Set(inSource.map((p) => p.category))].sort()
  const counts = {
    community: all.filter((p) => p.sourceType === 'community').length,
    builtin: all.filter((p) => p.sourceType === 'builtin').length,
  }
  return { items, total, page, pageCount, categories, counts }
}

/** The card's fields, out of a full record. */
export function toCatalogueEntry<T extends CatalogueEntry>(
  p: T,
): CatalogueEntry {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    author: p.author,
    category: p.category,
    kind: p.kind,
    tags: p.tags,
    stars: p.stars,
    verified: p.verified,
    sourceType: p.sourceType,
    builtIn: p.builtIn,
    addedAt: p.addedAt,
    updatedAt: p.updatedAt,
    thumb: p.thumb,
    thumbW: p.thumbW,
    thumbH: p.thumbH,
    accent: p.accent,
    initials: p.initials,
    stats: p.stats,
  }
}
