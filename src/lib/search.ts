import type { SearchEntry } from '@/lib/content'

/**
 * Ranking and snippets for the site-wide search. The index itself is built on
 * the server (see getSearchIndex) and fetched once when the palette opens;
 * everything here runs against it in memory, so a query is a pass over an
 * array with nothing to debounce and no request to fall out of order.
 */

/** Asks the mounted palette to open: the navbar button, a shortcut, a link. */
export const OPEN_SEARCH_EVENT = 'omarchy-open-search'

export type SearchHit = SearchEntry & {
  score: number
  /** The matched run of text, split so the UI can mark it without any HTML. */
  snippet: { before: string; match: string; after: string } | null
}

/** ~70 characters of context either side of the first term that matched. */
function snippetAround(text: string, at: number, length: number) {
  const from = Math.max(0, at - 70)
  const to = Math.min(text.length, at + length + 70)
  return {
    before: (from > 0 ? '…' : '') + text.slice(from, at),
    match: text.slice(at, at + length),
    after: text.slice(at + length, to) + (to < text.length ? '…' : ''),
  }
}

/**
 * Every term has to appear somewhere in an entry for it to be a hit, and
 * where it appears is what ranks it: a word in a title beats one in a
 * heading, which beats one buried in the prose. A plugin or a theme is a
 * name, so a name match there is worth as much as a chapter title.
 */
export function searchAll(
  index: SearchEntry[],
  query: string,
  limit = 12,
): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []

  const hits: SearchHit[] = []
  for (const entry of index) {
    const title = entry.title.toLowerCase()
    const heading = (
      entry.kind === 'manual' ? (entry.heading ?? '') : ''
    ).toLowerCase()
    const text = entry.text.toLowerCase()

    let score = 0
    let snippet: SearchHit['snippet'] = null
    let matchedAll = true

    for (const term of terms) {
      const inTitle = title.includes(term)
      const inHeading = heading.includes(term)
      const at = text.indexOf(term)
      if (!inTitle && !inHeading && at < 0) {
        matchedAll = false
        break
      }
      if (inTitle) score += title.startsWith(term) ? 14 : 9
      if (inHeading) score += heading.startsWith(term) ? 8 : 6
      if (at >= 0) {
        score += 1
        // Only prose carries a snippet worth showing. A plugin's index text
        // is its category and tags, which the row already prints.
        if (!snippet && (entry.kind === 'manual' || entry.kind === 'news')) {
          snippet = snippetAround(entry.text, at, term.length)
        }
      }
    }
    if (!matchedAll) continue

    // A section headed by the thing you searched for beats a chapter that
    // merely mentions it, but a chapter's opening still outranks its footnotes.
    if (entry.kind === 'manual' && !entry.heading) score += 1
    // With everything else equal the manual is the thing people came to read.
    if (entry.kind === 'manual') score += 1

    hits.push({ ...entry, score, snippet })
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** What each kind is called in a result row. */
export const KIND_LABEL: Record<SearchEntry['kind'], string> = {
  manual: 'Manual',
  news: 'News',
  plugin: 'Plugin',
  theme: 'Theme',
}
