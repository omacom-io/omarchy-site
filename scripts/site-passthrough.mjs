/**
 * The files omarchy.org serves that the app does not render: the parts of
 * the omarchy-site checkout laid over the built folder by assemble-static,
 * and served straight from that checkout by the dev server. One list, so
 * what you see in development is what the build ships.
 */

/** Copied whole. Paths, not globs, so the list reads as an inventory. */
export const WHOLE = [
  'assets',
  'install',
  'install-dev',
  'install-rc',
  'upgrade-to-quattro',
  'upgrade-to-quattro-dev',
  'patch',
  '.well-known',
  'icon.svg',
  'CNAME',
  '.nojekyll',
  'plans',
  // Not yet redesigned: served as they are until each is absorbed.
  'screensaver',
  'discord',
  'patrons/badges',
]

/** Copied except for the rendered pages, which the app now produces: the
 *  images beside news posts and manual chapters, the omakub page's, and
 *  the brand page's downloadable files. */
export const ASSETS_ONLY = ['news', 'manual', 'omakub', 'brand']

/**
 * Addresses omarchy.org still answers for that the redesign folded into
 * other pages. GitHub Pages cannot redirect, so each gets a page that does
 * - the same way the site's own /discord/ has always worked.
 */
export const REDIRECTS = {
  '/manual/toc/': '/manual/',
  '/security/credits/': '/security/#credits',
}

/** Whether a request path is one the checkout answers for. */
export function isPassthrough(pathname) {
  const rel = pathname.replace(/^\/+/, '')
  if (WHOLE.some((p) => rel === p || rel.startsWith(p + '/'))) return true
  return ASSETS_ONLY.some(
    (p) =>
      rel.startsWith(p + '/') &&
      !rel.endsWith('index.html') &&
      /\.[a-z0-9]+$/i.test(rel),
  )
}
