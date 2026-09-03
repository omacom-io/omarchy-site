/**
 * The news, read from omarchy.org's own files.
 *
 * The site's Ruby build renders each post from Markdown into
 * news/YYYY/MM/slug/index.html and writes the feed beside them, and both are
 * committed. The porter reads those rendered pages into news-posts.json at
 * build time, so this module only has to hand them out. Nothing is fetched:
 * the repository is the source, and the feed the site serves is the one the
 * Ruby build wrote, copied into the output untouched.
 */

export type NewsPost = {
  slug: string
  year: string
  month: string
  /** The canonical address, dated and slash-terminated: /news/2026/09/slug/.
   *  It is the feed's GUID and every link anyone has shared. */
  path: string
  title: string
  /** ISO date, YYYY-MM-DD. */
  date: string
  /** The date as prose: "September 3, 2026". */
  dateStr: string
  excerpt: string
  html: string
}

export type NewsSummary = Omit<NewsPost, 'html'>

let posts: Array<NewsPost> | null = null

export async function loadNews(): Promise<Array<NewsPost>> {
  if (posts) return posts
  const mod = await import('../data/news-posts.json')
  posts = mod.default
  return posts
}

/** The list without the bodies - what an index or a teaser row needs. */
export function summarize(list: Array<NewsPost>): Array<NewsSummary> {
  return list.map(({ html: _html, ...rest }) => rest)
}
