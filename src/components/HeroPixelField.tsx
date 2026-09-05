import { useEffect, useRef } from 'react'
import { OPEN_PICKER_EVENT, PICKER_STATE_EVENT, THEME_EVENT } from '@/lib/theme'
import { GRID_CLEAR_EVENT, GRID_EVENT } from '@/lib/pixel-grid'
import {
  WORDMARK_HEIGHT,
  WORDMARK_ROWS,
  WORDMARK_WIDTH,
} from '@/data/wordmark-bitmap'
import { BANDS, loadMusic, music } from '@/lib/music'

/**
 * A word drawn on the field's own lattice. The hero wears the wordmark; the
 * 404 wears NOT FOUND, cut in the same letterforms. Everything downstream is
 * measured from the slot element, so a different word only has to say how
 * many cells wide and tall it is.
 */
export type FieldGlyph = {
  rows: readonly string[]
  width: number
  height: number
}

export const WORDMARK_GLYPH: FieldGlyph = {
  rows: WORDMARK_ROWS,
  width: WORDMARK_WIDTH,
  height: WORDMARK_HEIGHT,
}

/* One grid, one renderer. The wordmark is not a layer sitting on top of the
 * background: its cells are cells of the same lattice as the field around
 * it, snapped to the same origin, so no viewport size can knock the two out
 * of alignment. */

/** The field's colors come from the active theme's --t-field-* tokens. */
function readPalette() {
  const style = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback
  return {
    bg: token('--t-field-bg', '#0e0e14'),
    dim: token('--t-field-dim', '#39482e'),
    mid: token('--t-field-mid', '#678549'),
    lit: token('--t-field-lit', '#9ece6a'),
    hover: token('--t-field-hover', '#bbdd97'),
    crest: token('--t-field-crest', '#daecc6'),
  }
}

/** Classic 8x8 ordered dither matrix, 0..63. */
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36,
  14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23,
  61, 29, 53, 21,
]

const NOISE_SIZE = 128
/** Grid cells per unit of noise: how big the drifting blobs read. */
const CELLS_PER_NOISE = 9
/** Cursor reach, in grid cells. */
const CURSOR_CELLS = 12

/* The track. From the first paint, the field itself listens: each column of
 * cells belongs to a band of the spectrum, mirrored about the middle with
 * the bass at the outer edges where the resting field is densest and the
 * treble towards the centre, and the band's loudness decides how far up
 * from the bottom that column's dither thickens. Nothing is drawn on top
 * of the field; the same cells, the same dither, a different reason to
 * light. The ramp still keeps the middle clear for the word and the copy.
 * Beats push the cursor's glow out for a moment, and a hard beat fires the
 * click ripple from under the pointer. */
/** How much of the field's height the loudest band may climb. */
const SPECTRUM_REACH = 0.92
/** How dense a column gets, and how much of it wears the main ink. */
const SPECTRUM_DENSITY = 0.7
const SPECTRUM_HEAT = 0.5
/** Below this a band is resting and its column shows nothing extra. */
const SPECTRUM_FLOOR = 0.08
/** How much of a band's height a beat adds, and how fast that fades. */
const BEAT_REACH = 0.8
const BEAT_DECAY = 0.84
/** Beats at least this strong, against the hardest of the last seconds,
 *  throw a ripple from the pointer: about every other beat of a groove. */
const BEAT_RIPPLE = 0.8

/**
 * The square-spiral logo glyph as a 15x15 bitmap, taken from
 * omarchy-logo.svg, whose every path coordinate is a multiple of 80 in a
 * 1200 viewBox. A click stamps this glyph onto the field grid, growing
 * from under a cell per logo pixel to a few, dissolving through the
 * dither as it fades. Tempo and final size jitter a little per click so
 * no two stamps are quite twins, while every stamp is the same mark.
 */
const LOGO_SIZE = 15
const LOGO_ROWS = [
  '111111111111111',
  '100000010000001',
  '101111110001101',
  '101000000000101',
  '101000000000101',
  '101000000000101',
  '101000000000101',
  '111000000000101',
  '101000000000101',
  '101000000000101',
  '101000000000101',
  '101000000000101',
  '101111111111101',
  '100000010000001',
  '111111110111111',
]

/* The stamp is charged by the press itself: the glyph grows under the
 * pointer while the button is held, and release launches it from exactly
 * that size. A tap gives a small quick mark; a full hold a big slow bloom
 * that lives longer. */
const CHARGE_TIME = 1.1
const CHARGE_FROM = 0.45
const CHARGE_GROWTH = 1.6

type Ping = {
  x: number
  y: number
  born: number
  /** Cells per logo pixel at launch and at full bloom. */
  from: number
  to: number
  /** Seconds the stamp takes to bloom out and dissolve. */
  life: number
}

function buildNoise(seed: number) {
  const size = NOISE_SIZE
  let state = seed >>> 0
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }

  let field = new Float32Array(size * size)
  for (let i = 0; i < field.length; i++) field[i] = random()

  // A couple of box passes turn white noise into soft blobs.
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float32Array(size * size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let sum = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const sx = (x + dx + size) % size
            const sy = (y + dy + size) % size
            sum += field[sy * size + sx]
          }
        }
        next[y * size + x] = sum / 9
      }
    }
    field = next
  }

  // Box blurring collapses the range, so stretch it back out.
  let min = Infinity
  let max = -Infinity
  for (const v of field) {
    if (v < min) min = v
    if (v > max) max = v
  }
  const span = max - min || 1
  for (let i = 0; i < field.length; i++) field[i] = (field[i] - min) / span

  return field
}

/** A fixed 64x64 tile of per-cell threshold offsets, tiled over the grid. */
function buildJitter(seed: number) {
  let state = seed >>> 0
  const tile = new Float32Array(64 * 64)
  for (let i = 0; i < tile.length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0
    tile[i] = state / 4294967296
  }
  return tile
}

function sample(field: Float32Array, x: number, y: number) {
  const size = NOISE_SIZE
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const fx = x - xi
  const fy = y - yi
  const x0 = ((xi % size) + size) % size
  const y0 = ((yi % size) + size) % size
  const x1 = (x0 + 1) % size
  const y1 = (y0 + 1) % size
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = field[y0 * size + x0]
  const b = field[y0 * size + x1]
  const c = field[y1 * size + x0]
  const d = field[y1 * size + x1]
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy
}

/** How much of the resting texture the wordmark-less variant keeps. The hero
 *  holds one block of copy in a tall empty frame, so its texture has room to
 *  spread; the footer is text almost edge to edge, and whatever survives is
 *  packed into a thin band right beside the words, which reads far heavier
 *  than the same figure does up there. Measured against the hero's own mean:
 *  this lands the footer at about a sixth of it. */
const FIELD_DENSITY = 0.3

/* The wordmark-less variant has no slot to measure, so it reproduces the one
 * the hero measures - `w-[88%] max-w-4xl` inside a px-6 column - and lands on
 * the same cell size. Without this it sized itself from the full window and
 * came out a quarter coarser than the hero it is quoting. */
const SLOT_INSET = 48
const SLOT_FRACTION = 0.88
const SLOT_MAX = 896
/** How far, in CSS px, the resting texture stays clear of a block of text. */
const CLEAR_REACH = 150
/**
 * How far the cursor's answer stays clear of anything on the hero: the bar's
 * items, the two buttons, the headline and the copy under it. The field is
 * the ground the page sits on, and it answers in the open - lighting it under
 * a word being read or a button being aimed at is the one place it is in the
 * way. Shorter than the footer's reach, because the hero has to leave itself
 * somewhere to answer at all.
 */
const HUSH_REACH = 96
/**
 * How the field comes back over that distance. A smoothstep is half strength
 * at the halfway mark, which put texture right up against the links; cubed,
 * it is an eighth there, so the field stays out of the way and only builds in
 * the margins. Almost none of the footer is further than the reach from
 * something readable, so this curve, not the density, is what decides how the
 * texture is distributed.
 */
const CLEAR_CURVE = 3

type Props = {
  /** Fired once the field has painted, so the SSR wordmark can step aside. */
  onPainted?: () => void
  /**
   * 'hero' draws the wordmark into the field, publishes the lattice for the
   * DOM to snap to, and treats a press on the logo as the theme picker.
   * 'field' is the same drifting texture, the same cursor response and the
   * same click stamps, with none of that: a ground, not a signature.
   */
  variant?: 'hero' | 'field'
  /** The word the field resolves into. Ignored by 'field'. */
  glyph?: FieldGlyph
  /**
   * What a press on the word does. The hero opens the theme picker; the 404
   * goes home. The hover glow and the pointer cursor come with it either way.
   */
  onGlyphPress?: () => void
}

/**
 * The hero field. Drifting value noise is thresholded through an ordered
 * dither into hard on/off cells, and the wordmark bitmap is stamped into the
 * same cells, so the logo reads as the field resolving into a word rather
 * than as artwork placed over it. The cursor raises local luminance, which
 * switches more cells on around the pointer in full brand green: density
 * changes, nothing glows.
 */
export function HeroPixelField({
  onPainted,
  variant = 'hero',
  glyph = WORDMARK_GLYPH,
  onGlyphPress,
}: Props) {
  // The press handler is read from inside an effect that must outlive every
  // render, so it arrives by ref: putting it in the dependency list would
  // tear down and rebuild the canvas whenever the parent re-rendered.
  const press = useRef(onGlyphPress)
  press.current = onGlyphPress

  const isHero = variant === 'hero'

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const paintedRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = canvas?.parentElement
    if (!canvas || !host) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    // On touch there is no pointer to follow: a finger dragging the page
    // would smear a lit patch down the hero. Taps still send ripples.
    const finePointer = window.matchMedia(
      '(hover: hover) and (pointer: fine)',
    ).matches
    const noise = buildNoise(0x9ece6a)
    const jitter = buildJitter(0x0a1f14)

    // Re-read the palette when the theme changes; the next frame paints in
    // the new colors. Reduced motion repaints once, immediately.
    let palette = readPalette()

    // The music: it is moving from the first paint, muted, off the track's
    // timeline, and live once the sound is on. The bands are smoothed with
    // a quick rise and a slow fall so peaks snap and tails linger, and the
    // beat pulse decays frame by frame. Only the hero listens, and never
    // under reduced motion.
    const spectrumOn = isHero && !reducedMotion
    if (spectrumOn) void loadMusic()
    const bandsNow = new Float32Array(BANDS)
    let beatPulse = 0

    const onTheme = () => {
      palette = readPalette()
      if (reducedMotion) draw(lastDraw)
    }
    window.addEventListener(THEME_EVENT, onTheme)

    const onPickerState = (event: Event) => {
      pickerOpen = Boolean((event as CustomEvent).detail?.open)
      if (pickerOpen) {
        logoHoverTarget = 0
        targetStrength = 0
        if (sectionEl) sectionEl.style.cursor = ''
      }
    }
    window.addEventListener(PICKER_STATE_EVENT, onPickerState)

    // Device-pixel geometry, recomputed on resize. Everything is drawn on
    // whole device pixels so cell edges stay razor sharp at any DPR.
    let dpr = 1
    let width = 0
    let height = 0
    let cols = 0
    let rows = 0
    // One grid for everything, anchored on the wordmark: the slot rect in
    // device px, divided into fractional cells. Field cells are the same
    // cells as logo pixels, addressed by the same indices, with the
    // wordmark occupying columns 0..80 and rows 0..18; the rest of the
    // field runs into negative and larger indices. Every drawn edge rounds
    // the same grid line, so cells butt pixel-perfectly everywhere.
    let wmX = 0
    let wmY = 0
    let wmCW = 10
    let wmCH = 10
    let cMin = 0
    let rMin = 0
    let ramp = new Float32Array(0)
    let publishedGrid = ''

    // The quiet block's own box is much taller and wider than the words in
    // it, so the ramp is measured from each line of copy instead. Those
    // boxes hug their text, being centred flex children.
    // Everything the field should stand clear of. On the hero that is the
    // bar's controls and every line the hero itself puts on the page; in the
    // footer it is the blocks marked as readable.
    const quietElements = isHero
      ? [
          ...document.querySelectorAll<HTMLElement>('header a, header button'),
          ...[
            ...document.querySelectorAll<HTMLElement>('[data-hero-quiet]'),
          ].flatMap((el) => [...el.children] as HTMLElement[]),
        ]
      : [...host.parentElement!.querySelectorAll<HTMLElement>('[data-quiet]')]

    const clearReachCss = CLEAR_REACH
    // The hero is a section; the 404 is a main. Either way this is the block
    // the pointer cursor belongs to while it is over the word.
    const sectionEl = host.closest<HTMLElement>('section, main')
    const pointer = { x: -1e4, y: -1e4 }
    let visible = true
    let strength = 0
    let targetStrength = 0
    let pings: Ping[] = []
    let holding: { x: number; y: number; start: number } | null = null
    // The wordmark doubles as the theme button: hovering any of its lit
    // pixels raises the whole logo to the hover tint, and a click opens
    // the picker rather than firing a stamp.
    let logoHover = 0
    let logoHoverTarget = 0
    let logoPending = false
    let pickerOpen = false

    /** Whether a device-px point is inside the wordmark's box. The box,
     * not the lit pixels: testing per pixel made the hover flicker off in
     * the gaps between letters while sweeping across the logo. */
    const onLogoAt = (px: number, py: number) =>
      isHero &&
      px >= wmX &&
      py >= wmY &&
      px < wmX + glyph.width * wmCW &&
      py < wmY + glyph.height * wmCH

    /**
     * Whether the pointer is on something you can press. A press on a control
     * does that control's job and nothing else: pressing Get Omarchy used to
     * charge and fire a stamp as well, so a few presses in a row threw a
     * burst of logos across the field while the page scrolled out from under
     * them. Hovering is unaffected - the hero still lights up under its own
     * buttons, which is the part worth keeping.
     */
    // A press that belongs to something else is not a press on the field:
    // any link, button or form control, anything in the site header, and
    // anything that marks itself out (the music card, the dev panel).
    const onControl = (target: EventTarget | null) =>
      target instanceof Element &&
      target.closest(
        'a, button, input, select, textarea, label, [role="button"], header, [data-no-stamp]',
      ) !== null

    /** 0..1: how far a held press has charged. */
    const chargeOf = (now: number, start: number) =>
      Math.min((now - start) / 1000 / CHARGE_TIME, 1)

    const measure = () => {
      const box = host.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) return false

      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const nextWidth = Math.round(box.width * dpr)
      const nextHeight = Math.round(box.height * dpr)
      // Assigning canvas.width wipes the buffer, so only do it when the size
      // has actually changed. A drag-resize fires this observer continuously
      // and every needless reset shows up as a flash of empty background.
      if (nextWidth !== width || nextHeight !== height) {
        width = nextWidth
        height = nextHeight
        canvas.width = width
        canvas.height = height
      }
      canvas.style.width = `${box.width}px`
      canvas.style.height = `${box.height}px`

      // The wordmark occupies exactly the slot rect; one slot pixel-unit
      // is one grid cell, so the whole field runs at the logo's resolution.
      // Only the hero has one. Left unscoped, the footer's field would find
      // the hero's slot on the home page and anchor its lattice to a box on
      // the far side of the document.
      const slot = isHero
        ? document.querySelector<HTMLElement>('[data-hero-wordmark]')
        : null
      const slotBox = slot?.getBoundingClientRect()
      const slotWidth =
        (slotBox?.width ??
          Math.min(SLOT_FRACTION * (box.width - SLOT_INSET), SLOT_MAX)) * dpr
      // With no slot, the lattice is anchored where the hero's slot would
      // sit: centred, at the same width. Matching the cell size was not
      // enough on its own - the two fields ran half a cell out of phase with
      // each other, so their columns did not line up. The row phase cannot
      // be matched the same way, since the hero's slot is placed by a flex
      // ratio against the viewport height rather than by a rule this can
      // restate; the two blocks are never in view together, and a vertical
      // offset in a field of noise has nothing to read against anyway.
      wmX = slotBox ? (slotBox.left - box.left) * dpr : (width - slotWidth) / 2
      wmY = ((slotBox?.top ?? box.top) - box.top) * dpr
      wmCW = (slotBox ? slotBox.width * dpr : slotWidth) / glyph.width
      wmCH =
        (slotBox
          ? slotBox.height * dpr
          : (slotWidth * glyph.height) / glyph.width) / glyph.height

      // Publish the lattice so DOM controls over the hero (the CTAs, the
      // floating navbar) can snap themselves onto the same grid. Publishing
      // only on change lets the snapper's re-measure requests converge.
      const gridKey = `${wmX},${wmY},${wmCW},${wmCH}`
      if (isHero && gridKey !== publishedGrid) {
        publishedGrid = gridKey
        window.dispatchEvent(
          new CustomEvent(GRID_EVENT, {
            detail: {
              x: slotBox?.left ?? 0,
              y: slotBox?.top ?? 0,
              cw: wmCW / dpr,
              ch: wmCH / dpr,
            },
          }),
        )
      }

      // Grid extents: enough whole cells on the wordmark's own lattice to
      // cover the canvas in every direction.
      cMin = -Math.ceil(wmX / wmCW) - 1
      rMin = -Math.ceil(wmY / wmCH) - 1
      cols = Math.ceil((width - wmX) / wmCW) - cMin + 1
      rows = Math.ceil((height - wmY) / wmCH) - rMin + 1

      // The hero's composition is one ellipse, because it holds one block of
      // copy in the middle of an empty frame. The footer holds five, spread
      // to its corners, so the same ellipse cleared the middle - where there
      // is nothing - and left the texture running under every word. Here the
      // copy itself is the composition: each block pushes the field back, and
      // what survives is the margin around them.
      const quietBoxes = isHero
        ? []
        : quietElements
            .map((el) => el.getBoundingClientRect())
            .filter((rect) => rect.width >= 1 && rect.height >= 1)
            .map((rect) => ({
              l: (rect.left - box.left) * dpr,
              t: (rect.top - box.top) * dpr,
              r: (rect.right - box.left) * dpr,
              b: (rect.bottom - box.top) * dpr,
            }))
      const clearReach = CLEAR_REACH * dpr
      const clearOf = (x: number, y: number) => {
        if (quietBoxes.length === 0) return 1
        let nearest = Infinity
        for (const q of quietBoxes) {
          const dx = Math.max(q.l - x, 0, x - q.r)
          const dy = Math.max(q.t - y, 0, y - q.b)
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < nearest) nearest = dist
        }
        if (nearest >= clearReach) return 1
        return (nearest / clearReach) ** CLEAR_CURVE
      }

      // The composition, baked once per resize: an elliptical ramp that
      // holds the middle of the frame clear for the wordmark and the copy,
      // and lets the dither build toward the edges and corners.
      ramp = new Float32Array(cols * rows)
      for (let r = 0; r < rows; r++) {
        const y = wmY + (rMin + r + 0.5) * wmCH
        const ny = (y / height) * 2 - 1
        // The header floats over this strip, so the texture thins out there
        // rather than sitting behind the nav links.
        // The header floats over the hero's top strip; nothing floats over
        // the footer's.
        const clear = isHero
          ? Math.min(1, Math.max(0.16, (y / dpr - 24) / 130))
          : FIELD_DENSITY
        for (let c = 0; c < cols; c++) {
          const x = wmX + (cMin + c + 0.5) * wmCW
          const nx = (x / width) * 2 - 1
          // The ellipse is the hero's composition and only the hero's: it
          // exists to leave a hole in the middle for the wordmark. Applied to
          // the footer it thinned the one place that is empty and left the
          // rest at full strength. There, the copy does all the shaping.
          const rr = Math.sqrt(nx * nx + ny * ny * 0.82)
          const eased = Math.min(1, Math.max(0, (rr - 0.42) / 0.85))
          const shape = isHero ? eased * eased : 1
          ramp[r * cols + c] = shape * clear * clearOf(x, y)
        }
      }
      return true
    }

    const draw = (time: number) => {
      const t = reducedMotion ? 0 : time / 1000

      // The pointer itself is never smoothed: the cells under the cursor are
      // the cells that light. Only the fade in and out of the field's
      // response is eased.
      strength += (targetStrength - strength) * 0.3
      logoHover = reducedMotion
        ? logoHoverTarget
        : logoHover + (logoHoverTarget - logoHover) * 0.25

      ctx.fillStyle = palette.bg
      ctx.fillRect(0, 0, width, height)

      // What the speakers are doing this frame. Bands rise fast and fall
      // slowly, so a hit lands at once and its tail lingers.
      let beatNow = 0
      let listening = false
      if (spectrumOn) {
        const heard = music.sample(time)
        for (let i = 0; i < BANDS; i++) {
          const rise = heard.bands[i] > bandsNow[i]
          bandsNow[i] += (heard.bands[i] - bandsNow[i]) * (rise ? 0.7 : 0.14)
          if (bandsNow[i] > 0.01) listening = true
        }
        beatNow = heard.beat
        beatPulse = Math.max(beatPulse * BEAT_DECAY, beatNow)
        if (beatPulse < 0.005) beatPulse = 0
      }

      // The reach follows the strength, so a quiet response is a smaller
      // patch as well as a fainter one. A beat pushes it out.
      const reach =
        CURSOR_CELLS *
        wmCW *
        (0.45 + 0.55 * strength) *
        (1 + BEAT_REACH * beatPulse)

      // A hard beat with the pointer on the field: a ripple from under it,
      // small and quick, the way a tap would.
      if (beatNow >= BEAT_RIPPLE && strength > 0.05 && !holding) {
        pings.push({
          x: pointer.x,
          y: pointer.y,
          born: time,
          from: 0.35,
          to: 0.9 + beatNow,
          life: 0.45,
        })
      }

      // Resolve each live click stamp once per frame, not once per cell.
      const stamps: {
        x: number
        y: number
        cellPx: number
        amp: number
      }[] = []
      if (pings.length > 0) {
        pings = pings.filter((ping) => (time - ping.born) / 1000 < ping.life)
        for (const ping of pings) {
          const age = (time - ping.born) / 1000 / ping.life
          // Ease-out growth, so the glyph leaps from the release and coasts.
          const grow = 1 - (1 - age) ** 3
          stamps.push({
            x: ping.x,
            y: ping.y,
            cellPx: wmCW * (ping.from + (ping.to - ping.from) * grow),
            amp: (1 - age) ** 1.7,
          })
        }
      }
      // A held press renders as a steady stamp growing under the pointer,
      // so you can watch what you are charging before you let it go.
      if (holding) {
        stamps.push({
          x: holding.x,
          y: holding.y,
          cellPx:
            wmCW *
            (CHARGE_FROM + CHARGE_GROWTH * chargeOf(time, holding.start)),
          amp: 0.9,
        })
      }

      /** The strongest live stamp covering a device-px point, if any. */
      const stampAt = (cx: number, cy: number) => {
        let amp = 0
        for (const stamp of stamps) {
          const lx = Math.floor((cx - stamp.x) / stamp.cellPx + LOGO_SIZE / 2)
          const ly = Math.floor((cy - stamp.y) / stamp.cellPx + LOGO_SIZE / 2)
          if (lx < 0 || ly < 0 || lx >= LOGO_SIZE || ly >= LOGO_SIZE) continue
          if (LOGO_ROWS[ly][lx] === '1' && stamp.amp > amp) amp = stamp.amp
        }
        return amp
      }

      for (let r = 0; r < rows; r++) {
        const row = rMin + r
        const yTop = wmY + row * wmCH
        const y = Math.round(yTop)
        const cellH = Math.round(yTop + wmCH) - y
        const cy = yTop + wmCH / 2
        for (let c = 0; c < cols; c++) {
          const col = cMin + c
          // Cells the wordmark occupies belong to the wordmark. On this
          // grid that is a plain index check: the logo IS cells 0..80 x
          // 0..18, so field and logo pixels butt edge to edge everywhere.
          if (
            isHero &&
            col >= 0 &&
            col < glyph.width &&
            row >= 0 &&
            row < glyph.height &&
            glyph.rows[row][col] === '1'
          ) {
            continue
          }

          const shade = ramp[r * cols + c]
          let lum = 0

          if (shade > 0.002) {
            const u = col / CELLS_PER_NOISE
            const v = row / CELLS_PER_NOISE
            const base =
              0.6 * sample(noise, u + t * 0.14, v - t * 0.055) +
              0.4 * sample(noise, u * 0.55 - t * 0.08, v * 0.55 + t * 0.06)

            // Each cell also blinks on its own rhythm: a slow sine with a
            // random per-cell phase, so appearing and disappearing is a
            // local event rather than the whole pattern sliding by.
            const twinkle =
              0.5 +
              0.5 *
                Math.sin(t * 1.1 + jitter[(row * 37 + col * 11) & 4095] * 6.283)

            // The ramp decides where the texture lives; the drifting noise
            // and the twinkle only make it breathe, so the composition
            // stays put.
            lum = shade * (0.3 + 0.52 * base * base + 0.18 * twinkle) * 0.62
          }

          const xLeft = wmX + col * wmCW
          const cx = xLeft + wmCW / 2

          let glowAmount = 0
          if (strength > 0.01) {
            const dx = cx - pointer.x
            const dy = cy - pointer.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < reach) {
              // Squared falloff: the reach is wide but only the middle of it
              // lights densely, so a bigger area responds without the
              // pointer dragging a solid blob of pixels around.
              const falloff = 1 - dist / reach
              glowAmount = falloff * falloff * strength
              lum += glowAmount * 0.6
            }
          }

          let waveAmount = 0
          if (stamps.length > 0) {
            waveAmount = stampAt(cx, cy)
            lum += waveAmount * 1.15
          }

          // The spectrum: this column's band, blended with its neighbour
          // so the bands do not read as bars, thickening the dither from
          // the bottom up to as high as the band is loud, densest low and
          // thinning towards the top. Gated by the ramp, so the word and
          // the copy keep their clear ground.
          let specAmount = 0
          if (listening && shade > 0.002) {
            const across = (c + 0.5) / cols
            const side = Math.abs(across - 0.5) * 2
            const bandPos = (1 - side) * BANDS - 0.5
            const b0 = Math.max(0, Math.min(BANDS - 1, Math.floor(bandPos)))
            const b1 = Math.min(BANDS - 1, b0 + 1)
            const mixB = Math.max(0, Math.min(1, bandPos - b0))
            const raw = bandsNow[b0] * (1 - mixB) + bandsNow[b1] * mixB
            const level = Math.max(
              0,
              (raw - SPECTRUM_FLOOR) / (1 - SPECTRUM_FLOOR),
            )
            const fromBottom = rows - 1 - r
            const tall = level * rows * SPECTRUM_REACH
            if (level > 0 && fromBottom < tall) {
              // Eases off towards the top rather than thinning in a straight
              // line, so the body of a column stays full higher up.
              specAmount = level * (1 - fromBottom / tall) ** 0.85
              lum += specAmount * SPECTRUM_DENSITY * Math.min(1, shade * 3)
            }
          }

          // Pure Bayer would light the same low-index cells everywhere and
          // read as a regular lattice at this density, so a fixed per-cell
          // offset scatters the resting field while the ordered structure
          // still shows up where the cursor pushes luminance high.
          const threshold =
            0.78 * ((BAYER[(row & 7) * 8 + (col & 7)] + 0.5) / 64) +
            0.22 * jitter[(row & 63) * 64 + (col & 63)]
          if (lum <= threshold) continue

          const heat = Math.max(
            glowAmount,
            waveAmount,
            specAmount * SPECTRUM_HEAT,
          )
          ctx.fillStyle =
            heat > 0.34 ? palette.lit : heat > 0.1 ? palette.mid : palette.dim
          const x = Math.round(xLeft)
          ctx.fillRect(x, y, Math.round(xLeft + wmCW) - x, cellH)
        }
      }

      // The wordmark, stamped into the same cells. It never moves or
      // dissolves. What touches it is the pointer passing over it and a
      // click ripple washing across: both recolor the pixels they reach and
      // leave them exactly where they were. Sharing a grid allows that.
      const cursorOnWordmark =
        isHero &&
        strength > 0.01 &&
        pointer.x > wmX - reach &&
        pointer.x < wmX + glyph.width * wmCW + reach &&
        pointer.y > wmY - reach &&
        pointer.y < wmY + glyph.height * wmCH + reach

      // Cell edges snap to whole device px with rounding against the shared
      // fractional grid, so adjacent cells always meet exactly: no seams
      // inside letters, and the outer edge lands on the same pixels as the
      // SSR fallback the canvas replaces.
      for (let row = 0; isHero && row < glyph.height; row++) {
        const bits = glyph.rows[row]
        const yTop = wmY + row * wmCH
        const y = Math.round(yTop)
        const rowHeight = Math.round(yTop + wmCH) - y

        // At rest the whole row can go out as a few spans.
        if (stamps.length === 0 && !cursorOnWordmark && logoHover < 0.01) {
          ctx.fillStyle = palette.lit
          let run = 0
          for (let col = 0; col <= glyph.width; col++) {
            if (bits[col] === '1') {
              run++
              continue
            }
            if (run > 0) {
              const x = Math.round(wmX + (col - run) * wmCW)
              ctx.fillRect(x, y, Math.round(wmX + col * wmCW) - x, rowHeight)
              run = 0
            }
          }
          continue
        }

        for (let col = 0; col < glyph.width; col++) {
          if (bits[col] !== '1') continue
          const xLeft = wmX + col * wmCW
          const x = Math.round(xLeft)

          const cx = xLeft + wmCW / 2
          const cy = yTop + wmCH / 2

          let crest = stamps.length > 0 ? stampAt(cx, cy) : 0

          if (cursorOnWordmark) {
            const dx = cx - pointer.x
            const dy = cy - pointer.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < reach) {
              const falloff = 1 - dist / reach
              const hit = falloff * falloff * strength
              if (hit > crest) crest = hit
            }
          }

          // Hovering the logo lifts every one of its pixels to the hover
          // tint; the cursor-local crest still brightens on top of it.
          if (logoHover > 0.01) {
            const floor = logoHover * 0.2
            if (floor > crest) crest = floor
          }

          ctx.fillStyle =
            crest > 0.45
              ? palette.crest
              : crest > 0.12
                ? palette.hover
                : palette.lit
          ctx.fillRect(x, y, Math.round(xLeft + wmCW) - x, rowHeight)
        }
      }

      if (!paintedRef.current) {
        paintedRef.current = true
        onPainted?.()
      }
    }

    let frame = 0
    let lastDraw = 0
    const loop = (time: number) => {
      frame = requestAnimationFrame(loop)
      // 40fps is plenty for a field that drifts this slowly.
      if (time - lastDraw < 25) return
      lastDraw = time
      draw(time)
    }

    /**
     * How loudly the field may answer at this point on screen. Full strength
     * out in the open, easing down as the pointer closes on anything
     * readable, so the effect shrinks on approach instead of dropping to its
     * quiet size the moment a word is crossed.
     *
     * The hero keeps a floor: it is the page's subject and answers even over
     * its own copy. The footer goes all the way to nothing, on the same curve
     * its resting texture uses, so the glow is simply absent anywhere near
     * the words. It used to be switched off over links and back on in
     * between, which lit the field up in every gap as you moved from one link
     * to the next.
     */
    const nearestTo = (
      list: HTMLElement[],
      clientX: number,
      clientY: number,
    ) => {
      let nearest = Infinity
      for (const el of list) {
        const rect = el.getBoundingClientRect()
        if (rect.width < 1 || rect.height < 1) continue
        const dx = Math.max(rect.left - clientX, 0, clientX - rect.right)
        const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom)
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < nearest) nearest = dist
      }
      return nearest
    }

    const reach = isHero ? HUSH_REACH : clearReachCss

    /**
     * Falls to nothing on the curve the resting texture uses, so there is no
     * edge anywhere for the glow to flicker across as the pointer moves from
     * one thing to the next.
     */
    const strengthAt = (clientX: number, clientY: number) => {
      const dist = nearestTo(quietElements, clientX, clientY)
      return dist >= reach ? 1 : (dist / reach) ** CLEAR_CURVE
    }

    const locate = (event: PointerEvent) => {
      const box = host.getBoundingClientRect()
      const inside =
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom
      return {
        inside,
        strength: strengthAt(event.clientX, event.clientY),
        x: (event.clientX - box.left) * dpr,
        y: (event.clientY - box.top) * dpr,
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!visible) return
      const { inside, strength: level, x, y } = locate(event)
      // While a press is held or the picker is up, the glow stays muted no
      // matter where the cursor wanders; only a move after both are done
      // wakes it back up.
      if (!holding && !pickerOpen) targetStrength = inside ? level : 0
      // While the picker is up, hovering is disarmed; the next real mouse
      // move after it closes re-arms it. Without this, choosing a theme
      // dropped you straight back into a hovered logo, since the pointer
      // never left it.
      const onLogo = !pickerOpen && inside && onLogoAt(x, y)
      logoHoverTarget = onLogo ? 1 : 0
      if (sectionEl) sectionEl.style.cursor = onLogo ? 'pointer' : ''
      if (!inside) return
      pointer.x = x
      pointer.y = y
      if (reducedMotion) draw(0)
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!visible) return
      const { inside, x, y } = locate(event)
      if (!inside) return
      pointer.x = x
      pointer.y = y
      // A press on the wordmark is a theme-picker click, not a stamp.
      if (onLogoAt(x, y)) {
        logoPending = true
        return
      }
      logoPending = false
      if (reducedMotion || onControl(event.target)) return
      // The press owns the stage: the hover glow fades out while holding
      // so the charging glyph reads clean, and comes back on release.
      targetStrength = 0
      holding = { x, y, start: performance.now() }
    }

    const onPointerUp = (event: PointerEvent) => {
      if (logoPending) {
        logoPending = false
        const { inside, x, y } = locate(event)
        if (inside && onLogoAt(x, y)) {
          if (press.current) press.current()
          else window.dispatchEvent(new CustomEvent(OPEN_PICKER_EVENT))
        }
        return
      }
      if (!holding) return
      // Restore the hover glow for wherever the pointer ended up.
      if (finePointer) {
        const { inside, strength: level } = locate(event)
        targetStrength = inside ? level : 0
      }
      const now = performance.now()
      const charge = chargeOf(now, holding.start)
      const from = CHARGE_FROM + CHARGE_GROWTH * charge
      // Keep the stamp queue short so a mash of clicks stays legible.
      pings = [
        ...pings.slice(-3),
        {
          x: holding.x,
          y: holding.y,
          born: now,
          from,
          // The launch continues from the charged size: bigger charges
          // bloom further and take longer to dissolve.
          // The uncharged tap stays small; the extra reach is mostly
          // bought by holding.
          to: (from + 1.0 + 3.2 * charge) * (0.92 + Math.random() * 0.16),
          life: (0.65 + 0.55 * charge) * (0.92 + Math.random() * 0.16),
        },
      ]
      holding = null
    }

    // Losing the pointer, or the right-click theme picker opening over a
    // held press, cancels the charge rather than firing it.
    const onPointerCancel = () => {
      holding = null
      logoPending = false
    }

    // A host with no size yet is not a host that will never have one: a
    // pane that opens later, a tab restored from the back/forward cache, an
    // ancestor that starts display:none. Bailing here used to be permanent,
    // because the observer that would have noticed the size arrive is set up
    // below. So nothing is given up on - drawing simply waits to be started
    // by whichever measurement succeeds first.
    let drawing = false
    const startDrawing = () => {
      if (drawing) return
      drawing = true
      if (reducedMotion) draw(0)
      else frame = requestAnimationFrame(loop)
    }
    if (measure()) startDrawing()

    // Everything below the hero is a full page of reading, and the field was
    // still redrawing itself at 40fps the whole way down. Drawing stops once
    // the hero leaves the viewport and picks up again on the way back.
    const visibility = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (reducedMotion) return
        if (visible && frame === 0) {
          frame = requestAnimationFrame(loop)
        } else if (!visible && frame !== 0) {
          cancelAnimationFrame(frame)
          frame = 0
        }
      },
      { rootMargin: '64px' },
    )
    visibility.observe(host)

    if (finePointer) {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
    }
    // Always attached: the wordmark click must work on touch and under
    // reduced motion too. Stamps gate themselves inside the handlers.
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerCancel, {
      passive: true,
    })
    window.addEventListener('contextmenu', onPointerCancel, {
      passive: true,
    })
    const observer = new ResizeObserver(() => {
      if (!measure()) return
      startDrawing()
      // Repaint in the same tick as the resize. Waiting for the throttled
      // frame would leave a just-cleared buffer on screen mid-drag.
      draw(reducedMotion ? 0 : lastDraw)
    })
    observer.observe(host)
    const slot = isHero ? document.querySelector('[data-hero-wordmark]') : null
    if (slot) observer.observe(slot)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      visibility.disconnect()
      window.removeEventListener(THEME_EVENT, onTheme)
      window.removeEventListener(PICKER_STATE_EVENT, onPickerState)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
      window.removeEventListener('contextmenu', onPointerCancel)
      if (isHero) window.dispatchEvent(new CustomEvent(GRID_CLEAR_EVENT))
    }
  }, [onPainted, isHero])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="hero-canvas-in absolute inset-0 h-full w-full select-none"
    />
  )
}
