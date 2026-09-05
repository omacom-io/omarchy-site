/**
 * Site themes: the stock Omarchy themes, applied the way Omarchy applies
 * them. There is no light/dark switch; there are themes, opened with T
 * (Omarchy's own chord still works, but Hyprland eats it before the browser
 * sees it), and every token in styles.css resolves per theme.
 */

import { OMARCHY_MARK_PATH } from '@/components/Brand'

export type SiteTheme = {
  id: string
  name: string
  /** A light page: the theme's background is the lighter of its two inks. */
  light?: true
}

export const SITE_THEMES: SiteTheme[] = [
  { id: 'catppuccin', name: 'Catppuccin' },
  { id: 'catppuccin-latte', name: 'Catppuccin Latte', light: true },
  { id: 'ethereal', name: 'Ethereal' },
  { id: 'everforest', name: 'Everforest' },
  { id: 'flexoki-light', name: 'Flexoki Light', light: true },
  { id: 'gruvbox', name: 'Gruvbox' },
  { id: 'hackerman', name: 'Hackerman' },
  { id: 'kanagawa', name: 'Kanagawa' },
  { id: 'last-horizon', name: 'Last Horizon' },
  { id: 'lumon', name: 'Lumon' },
  { id: 'lupine', name: 'Lupine', light: true },
  { id: 'matte-black', name: 'Matte Black' },
  { id: 'miasma', name: 'Miasma' },
  { id: 'nord', name: 'Nord' },
  { id: 'osaka-jade', name: 'Osaka Jade' },
  { id: 'retro-82', name: 'Retro 82' },
  { id: 'ristretto', name: 'Ristretto' },
  { id: 'rose-pine', name: 'Rosé Pine', light: true },
  { id: 'solitude', name: 'Solitude' },
  { id: 'tokyo-night', name: 'Tokyo Night' },
  { id: 'vantablack', name: 'Vantablack' },
  { id: 'white', name: 'White', light: true },
]

export const DEFAULT_THEME = 'tokyo-night'
export const THEME_KEY = 'omarchy-site-theme'
/** Fired on <window> after a theme lands, for canvas renderers to re-read. */
export const THEME_EVENT = 'omarchy-theme'
/** Ask the mounted ThemePicker to open (footer link, welcome notice). */
export const OPEN_PICKER_EVENT = 'omarchy-open-picker'
/** Fired with detail { open } whenever the picker opens or closes. */
export const PICKER_STATE_EVENT = 'omarchy-picker-state'
/** Set once the user has seen the picker or dismissed the welcome notice. */
export const HINT_KEY = 'omarchy-theme-hint-seen'

/**
 * Pre-paint script injected into <head>: stamps <html data-theme> from
 * localStorage before first paint, so there is never a flash of the wrong
 * theme. Unknown or missing values fall back to Tokyo Night.
 *
 * The tab icon is created here too, outside React. paintFavicon() replaces
 * that same tagged link; it must not touch a <link> React owns, or React
 * later tries to removeChild a node whose parent is already gone.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var ok=${JSON.stringify(
  SITE_THEMES.map((t) => t.id),
)};document.documentElement.dataset.theme=ok.indexOf(t)>=0?t:'${DEFAULT_THEME}'}catch(e){document.documentElement.dataset.theme='${DEFAULT_THEME}'}if(!document.querySelector('link[rel="icon"][data-theme-icon]')){var l=document.createElement('link');l.rel='icon';l.type='image/svg+xml';l.href='/brand/omarchy-logo.svg';l.setAttribute('data-theme-icon','');document.head.appendChild(l)}})()`

export function readTheme(): string {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (SITE_THEMES.some((t) => t.id === stored)) return stored as string
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_THEME
}

/**
 * Redraws the tab icon in the active theme's accent, the same way the marks
 * in the header and footer follow it. The glyph ships as a file baked in
 * Tokyo Night green, which only that one theme could wear, so this replaces
 * the tagged link with the same path painted in the current color. Browsers
 * cache a favicon by its element, not its URL, so the link is replaced
 * outright rather than re-pointed. Only [data-theme-icon] is touched: a
 * React-owned <link rel="icon"> pulled out of <head> crashes the next
 * commit with removeChild on a null parent.
 */
export function paintFavicon() {
  const brand = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-brand')
    .trim()
  if (!brand) return
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200"><path fill="${brand}" fill-rule="evenodd" clip-rule="evenodd" d="${OMARCHY_MARK_PATH}"/></svg>`
  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/svg+xml'
  link.setAttribute('data-theme-icon', '')
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`
  document
    .querySelectorAll('link[rel="icon"][data-theme-icon]')
    .forEach((old) => old.remove())
  document.head.appendChild(link)
}

/**
 * Resolves any CSS colour - oklch, color-mix, a bare keyword - to bytes, by
 * asking the canvas to paint it. Computed background colours on this site are
 * serialised in whatever space they were authored in, and a meta tag wants
 * one concrete value.
 */
let probe: CanvasRenderingContext2D | null | undefined
function toBytes(color: string) {
  if (probe === undefined) {
    probe =
      document.createElement('canvas').getContext('2d', {
        willReadFrequently: true,
      }) ?? null
  }
  if (!probe) return null
  probe.clearRect(0, 0, 1, 1)
  probe.fillStyle = color
  probe.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data
  return { r, g, b, a }
}

const hex = (n: number) => n.toString(16).padStart(2, '0')

/**
 * The colour actually painted at the very top of the window: the first thing
 * under that edge with something opaque behind it. The bar itself is skipped
 * when it has no surface, which is most of the time on a phone.
 */
/**
 * The page's own ground at a point: the section, main or body it sits on,
 * never the content laid over that. A plugin card is lighter than the section
 * it sits in and an image is any colour at all, so asking what is painted at
 * a point answers with whatever happens to be there; asking which of the
 * page's grounds is there answers with the thing that surrounds it.
 *
 * The bar is skipped, or it would sample itself.
 */
function groundAtPoint(x: number, y: number) {
  const GROUNDS = 'section, main, footer, body'
  const hit = document
    .elementsFromPoint(x, y)
    .find((el) => !el.closest('header'))
  let el: Element | null = hit?.closest(GROUNDS) ?? null
  while (el) {
    const rgb = toBytes(getComputedStyle(el).backgroundColor)
    // A ground you can see through is not the ground; keep going up.
    if (rgb && rgb.a >= 250) return { el, rgb }
    el = el.parentElement?.closest(GROUNDS) ?? null
  }
  return null
}

const paint6 = (rgb: { r: number; g: number; b: number }) =>
  `#${hex(rgb.r)}${hex(rgb.g)}${hex(rgb.b)}`

/**
 * The colour a given ground is painted, walking up while it is see-through:
 * a section with no background of its own is showing the page's.
 */
export function groundOf(node: Element) {
  let el: Element | null = node
  while (el) {
    const rgb = toBytes(getComputedStyle(el).backgroundColor)
    if (rgb && rgb.a >= 250) return paint6(rgb)
    el = el.parentElement
  }
  return null
}

/** The colour of the ground at a single point. */
export function groundAt(x: number, y: number) {
  const found = groundAtPoint(x, y)
  return found ? paint6(found.rgb) : null
}

/**
 * The colour a horizontal strip is sitting on, blended where it straddles two
 * grounds in proportion to how much of the strip each one holds.
 *
 * A 56px bar over a section boundary can only be one colour, and choosing one
 * side meant it changed the instant the edge touched it. Mixing by share
 * moves it a pixel at a time instead, so the bar arrives at the next
 * section's colour exactly as that section finishes arriving under it.
 */
export function groundAcross(x: number, top: number, bottom: number) {
  const lower = groundAtPoint(x, bottom)
  if (!lower) return null
  const upper = groundAtPoint(x, top)
  if (!upper || upper.el === lower.el) return paint6(lower.rgb)

  const edges = [
    upper.el.getBoundingClientRect().bottom,
    lower.el.getBoundingClientRect().top,
  ].filter((edge) => edge > top && edge < bottom)
  const boundary = edges.length ? Math.min(...edges) : bottom
  // The share of the strip still held by the ground above.
  const held = (boundary - top) / (bottom - top)
  const blend = (a: number, b: number) => Math.round(a * held + b * (1 - held))
  return paint6({
    r: blend(upper.rgb.r, lower.rgb.r),
    g: blend(upper.rgb.g, lower.rgb.g),
    b: blend(upper.rgb.b, lower.rgb.b),
  })
}

/** The colour at the very top of the window, for the browser's own chrome. */
function topColor() {
  return groundAt(Math.floor(document.documentElement.clientWidth / 2), 1)
}

/**
 * Keeps the browser's own chrome on the colour the page is showing it. Safari
 * tints the strip behind the status bar with this, so a value baked in at
 * build time left every other theme framed in Tokyo Night's background,
 * and a single value per theme left every section but one framed in another
 * section's. It follows the scroll instead.
 */
export function paintChrome() {
  const root = getComputedStyle(document.documentElement)
  const fallback = root.getPropertyValue('--color-bg').trim()
  const color = topColor() ?? fallback
  if (!color) return
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  if (meta.content !== color) meta.content = color
}

/**
 * Runs paintChrome as the page moves under that top edge. Returns its own
 * teardown.
 */
export function watchChrome() {
  // Straight from the event, not through a frame. It costs one hit test and a
  // couple of style reads, and iOS defers animation frames during a momentum
  // scroll - which is exactly the part of a scroll this needs to keep up
  // with. scrollend catches the settle on the browsers that fire it.
  paintChrome()
  window.addEventListener('scroll', paintChrome, { passive: true })
  window.addEventListener('scrollend', paintChrome)
  window.addEventListener('resize', paintChrome)
  window.addEventListener('orientationchange', paintChrome)
  return () => {
    window.removeEventListener('scroll', paintChrome)
    window.removeEventListener('scrollend', paintChrome)
    window.removeEventListener('resize', paintChrome)
    window.removeEventListener('orientationchange', paintChrome)
  }
}

/**
 * Applies a theme: stamps it, persists it, and disables transitions for the
 * swap so hundreds of colors don't tween independently. Canvas renderers
 * listen for THEME_EVENT and re-read their colors.
 */
export function applyTheme(id: string) {
  const root = document.documentElement
  root.classList.add('no-transitions')
  root.dataset.theme = id
  try {
    localStorage.setItem(THEME_KEY, id)
  } catch {
    /* storage unavailable */
  }
  paintFavicon()
  paintChrome()
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: id }))
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove('no-transitions'))
  })
}
