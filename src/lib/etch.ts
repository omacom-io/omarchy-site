/**
 * ttfx's laseretch, played on the field's own cells.
 *
 * ttfx (github.com/omacom/ttfx) is a terminal engine: it takes text, runs an
 * effect over a grid of character cells, and each frame hands back a symbol
 * and a colour per cell. Nothing about it is pixels. So the wordmark bitmap
 * goes in as text - one block character per lit cell, blanks elsewhere - and
 * the cells that come back are painted straight into the lattice the field
 * already draws on. The effect's timing, beam and sparks are ttfx's own; the
 * pixels are ours, and the finished word is the bitmap, cell for cell.
 *
 * A terminal cell is a character, though, not a square: the beam is a run
 * of slashes, a spark is a dot or a star. Painted as whole squares they turn
 * to mush, so every cell comes back with what it holds, and the field draws
 * a slash as a thin diagonal and a dot as a dot, at the cell's own scale.
 */

/** Cells of field around the word that the effect may throw sparks into. */
export const ETCH_PAD_ROWS = 4
export const ETCH_PAD_COLS = 6

type Session = {
  step: () => boolean
  fill: (
    symbols: Uint32Array,
    fg: Uint32Array,
    bg: Uint32Array,
    flags: Uint8Array,
  ) => void
  width: () => number
  height: () => number
  free: () => void
}

type Ttfx = {
  default: (input: { module_or_path: string }) => Promise<unknown>
  Session: new (
    input: string,
    effect: string,
    columns: number,
    rows: number,
    seed: number | null | undefined,
    frameRate: number,
    palette?: string | null,
    background?: string | null,
  ) => Session
}

const SCRIPT = '/ttfx/0.3.2/ttfx.js'
/** Every effect in one build: the one the screensaver page already ships. */
const WASM = '/ttfx/effects/all.wasm'
/**
 * What plays unless the address says otherwise (?etch=beams): a different
 * effect each time, drawn from the whole set, never the same one twice
 * running.
 */
export const DEFAULT_EFFECT = 'random'
/** Every effect in the build, as ttfx names them. */
export const EFFECTS = [
  'beams',
  'binarypath',
  'blackhole',
  'bouncyballs',
  'bubbles',
  'burn',
  'colorshift',
  'crumble',
  'decrypt',
  'errorcorrect',
  'expand',
  'fireworks',
  'highlight',
  'laseretch',
  'matrix',
  'middleout',
  'orbittingvolley',
  'overflow',
  'pour',
  'print',
  'rain',
  'randomsequence',
  'rings',
  'scattered',
  'slice',
  'slide',
  'smoke',
  'spotlights',
  'spray',
  'swarm',
  'sweep',
  'synthgrid',
  'thunderstorm',
  'unstable',
  'vhstape',
  'waves',
  'wipe',
] as const
/** Fired with `{ detail: name }` to play an effect on the word now. */
export const ETCH_EVENT = 'omarchy-etch'

/**
 * Runs in the head, before the first paint: when the effect is going to
 * play, the server-rendered word is kept out of sight from the very start,
 * so the first the reader sees of the word is the effect making it, not
 * the whole word followed by a reveal of what they just saw. Reduced
 * motion keeps the word. If nothing ever paints the canvas (scripts
 * blocked, an old browser) the word comes back after a few seconds. The
 * script also leaves a mark that stays, so the field can tell the word was
 * held however late it arrives (see wordWasHeld in HeroPixelField).
 */
export const etchInitScript = `(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var h=document.documentElement;h.classList.add('etch-pending');h.setAttribute('data-etch-held','');setTimeout(function(){h.classList.remove('etch-pending')},5000)}catch(e){}})()`
/**
 * Effect steps per second. ttfx's own default is 240, and at that pace
 * the effects run from a third of a second to eighteen across this word.
 * These bring every one of them into a second and a half to five: the
 * long ones faster, the blink-and-miss ones slower.
 */
const STEPS: Record<string, number> = {
  laseretch: 400,
  swarm: 720,
  fireworks: 300,
  decrypt: 300,
  orbittingvolley: 300,
  print: 360,
  rings: 360,
  bubbles: 320,
  expand: 100,
  highlight: 100,
  middleout: 100,
  overflow: 60,
  wipe: 100,
  slide: 120,
  slice: 120,
  randomsequence: 150,
  scattered: 150,
  sweep: 150,
}
const DEFAULT_STEPS = 240

/**
 * Out of the draw. Matrix and thunderstorm take their length in seconds
 * from ttfx itself, thirteen and sixteen of them, and no pace changes
 * that. Swarm, spotlights and rings just did not look right on the word.
 * All of them can still be asked for by name.
 */
const NOT_DRAWN = new Set([
  'matrix',
  'thunderstorm',
  'swarm',
  'spotlights',
  'rings',
])

let lastPicked = ''
/** An effect at random, never the one that played last. */
export function pickEffect(): string {
  const pool = EFFECTS.filter(
    (name) => name !== lastPicked && !NOT_DRAWN.has(name),
  )
  const name = pool[Math.floor(Math.random() * pool.length)]
  lastPicked = name
  return name
}

/** A name from the address or the panel, resolved to something to play. */
export function resolveEffect(name: string): string {
  return name === 'random' ? pickEffect() : name
}
/** U+2588 FULL BLOCK, the character every lit cell goes in as. */
const BLOCK = 0x2588

let loading: Promise<Ttfx> | null = null

/** The engine, fetched and instantiated once per page. */
function load(): Promise<Ttfx> {
  loading ??= (async () => {
    // A full URL, so the dev server hands the file over as-is: it lives in
    // public/, outside the module graph, the way any static asset does.
    const url = new URL(SCRIPT, window.location.origin).href
    const mod = (await import(/* @vite-ignore */ url)) as Ttfx
    await mod.default({ module_or_path: WASM })
    return mod
  })()
  return loading
}

/**
 * What a cell holds, in pixel terms. A block is the word itself, a whole
 * cell. A line is a slash or a bar, drawn thin. A mark is any other
 * character - a dot, a star, a letter mid-decrypt - drawn as a smaller
 * square whose size follows how much ink the character carries, so a
 * cell full of `@` reads heavier than one with a `.` in it.
 */
export type EtchKind = 'block' | 'part' | 'line' | 'mark'

export type EtchCell = {
  /** Lattice column and row, relative to the wordmark's top-left cell. */
  col: number
  row: number
  /** Packed 0xRRGGBB, the effect's own colour for the cell. */
  rgb: number
  kind: EtchKind
  /** The character itself. */
  symbol: number
  /** For a mark: the share of the cell it fills, 0..1. */
  weight: number
  /** For a line: which way it runs. */
  line?: 'up' | 'down' | 'bar' | 'dash'
  /** For a part: the rectangles it covers, in cell units (0..1). */
  parts?: ReadonlyArray<readonly [x: number, y: number, w: number, h: number]>
}

export type Etch = {
  /**
   * Advance to `time` (ms, rAF clock). Returns false once the effect has
   * played out and its last frame has faded into the resting word; the
   * caller then draws the word itself.
   */
  advance: (time: number) => boolean
  /** Every occupied cell of the current frame. */
  cells: () => EtchCell[]
  /**
   * How far the finished frame has faded into the resting word, 0 while
   * the effect still runs, then 0..1 over the tail.
   */
  settle: () => number
  free: () => void
}

/** Milliseconds the finished frame takes to settle into the resting word. */
const SETTLE_MS = 220

const LINES: Record<number, EtchCell['line']> = {
  0x2f: 'up', // /
  0x2571: 'up',
  0x5c: 'down', // backslash
  0x2572: 'down',
  0x7c: 'bar', // |
  0x2502: 'bar',
  0x2503: 'bar',
  0x2d: 'dash', // -
  0x2500: 'dash',
  0x2501: 'dash',
  0x5f: 'dash', // _
}

type Rect = readonly [x: number, y: number, w: number, h: number]

/**
 * Unicode Block Elements (U+2580..259F) are exact shapes: eighths of a cell
 * from the bottom or the left, halves, quadrants, and three shades. Each is
 * given as the rectangles it covers, in cell units, so the field can draw
 * a wave's crest or a beam's tail as the shape it is. The shades become
 * the classic dither: one, two or three of four quarter-cells.
 */
const Q = 0.5
const QUADRANT: Record<string, Rect> = {
  tl: [0, 0, Q, Q],
  tr: [Q, 0, Q, Q],
  bl: [0, Q, Q, Q],
  br: [Q, Q, Q, Q],
}
const BLOCK_PARTS: Record<number, ReadonlyArray<Rect>> = {
  0x2580: [[0, 0, 1, Q]], // upper half
  0x2581: [[0, 7 / 8, 1, 1 / 8]],
  0x2582: [[0, 6 / 8, 1, 2 / 8]],
  0x2583: [[0, 5 / 8, 1, 3 / 8]],
  0x2584: [[0, Q, 1, Q]], // lower half
  0x2585: [[0, 3 / 8, 1, 5 / 8]],
  0x2586: [[0, 2 / 8, 1, 6 / 8]],
  0x2587: [[0, 1 / 8, 1, 7 / 8]],
  0x2589: [[0, 0, 7 / 8, 1]],
  0x258a: [[0, 0, 6 / 8, 1]],
  0x258b: [[0, 0, 5 / 8, 1]],
  0x258c: [[0, 0, Q, 1]], // left half
  0x258d: [[0, 0, 3 / 8, 1]],
  0x258e: [[0, 0, 2 / 8, 1]],
  0x258f: [[0, 0, 1 / 8, 1]],
  0x2590: [[Q, 0, Q, 1]], // right half
  0x2591: [QUADRANT.tl], // light shade
  0x2592: [QUADRANT.tl, QUADRANT.br], // medium shade
  0x2593: [QUADRANT.tl, QUADRANT.br, QUADRANT.tr], // dark shade
  0x2594: [[0, 0, 1, 1 / 8]], // upper eighth
  0x2595: [[7 / 8, 0, 1 / 8, 1]], // right eighth
  0x2596: [QUADRANT.bl],
  0x2597: [QUADRANT.br],
  0x2598: [QUADRANT.tl],
  0x2599: [QUADRANT.tl, QUADRANT.bl, QUADRANT.br],
  0x259a: [QUADRANT.tl, QUADRANT.br],
  0x259b: [QUADRANT.tl, QUADRANT.tr, QUADRANT.bl],
  0x259c: [QUADRANT.tl, QUADRANT.tr, QUADRANT.br],
  0x259d: [QUADRANT.tr],
  0x259e: [QUADRANT.tr, QUADRANT.bl],
  0x259f: [QUADRANT.tr, QUADRANT.bl, QUADRANT.br],
}

/** How much of a cell a character's ink covers, by eye. */
function weightOf(symbol: number): number {
  const ch = String.fromCodePoint(symbol)
  if (".,'`\u00b7".includes(ch)) return 0.12
  if (':;^~"'.includes(ch)) return 0.2
  if ('*+=<>()[]{}!?i l1'.includes(ch)) return 0.35
  if ('#@%&$MW'.includes(ch)) return 0.7
  return 0.5
}

function describe(
  symbol: number,
): Pick<EtchCell, 'kind' | 'weight' | 'line' | 'parts'> {
  if (symbol === BLOCK) return { kind: 'block', weight: 1 }
  if (symbol in BLOCK_PARTS)
    return { kind: 'part', weight: 1, parts: BLOCK_PARTS[symbol] }
  const line = LINES[symbol]
  if (line) return { kind: 'line', weight: 0.2, line }
  return { kind: 'mark', weight: weightOf(symbol) }
}

/** The bitmap as ttfx text: a block per lit cell, a margin of blanks. */
function toText(rows: readonly string[], width: number, height: number) {
  const columns = width + ETCH_PAD_COLS * 2
  const blank = ' '.repeat(columns)
  const text: string[] = []
  for (let r = 0; r < ETCH_PAD_ROWS; r++) text.push(blank)
  for (let r = 0; r < height; r++) {
    let line = ' '.repeat(ETCH_PAD_COLS)
    for (let c = 0; c < width; c++) line += rows[r][c] === '1' ? '█' : ' '
    text.push(line + ' '.repeat(ETCH_PAD_COLS))
  }
  for (let r = 0; r < ETCH_PAD_ROWS; r++) text.push(blank)
  return { text: text.join('\n'), columns, lines: height + ETCH_PAD_ROWS * 2 }
}

/**
 * Where ttfx puts the word. It trims the margin and re-centres what is left
 * in its frame, by a rule of its own, so rather than guess at it the effect
 * is run through once off-screen and its finished frame is compared with
 * the input. Measured once per bitmap.
 */
const offsets = new Map<string, { dx: number; dy: number }>()

function measureOffset(
  ttfx: Ttfx,
  text: string,
  columns: number,
  lines: number,
  rows: readonly string[],
  effect: string,
) {
  const key = `${effect}:${columns}x${lines}:${rows.join('')}`
  const known = offsets.get(key)
  if (known) return known

  const probe = new ttfx.Session(
    text,
    effect,
    columns,
    lines,
    0,
    DEFAULT_STEPS,
    null,
    null,
  )
  for (let guard = 0; guard < 100_000 && probe.step(); guard++) {
    /* run to the end */
  }
  const w = probe.width()
  const h = probe.height()
  const symbols = new Uint32Array(w * h)
  probe.fill(
    symbols,
    new Uint32Array(w * h),
    new Uint32Array(w * h),
    new Uint8Array(w * h),
  )
  probe.free()

  // The first block in reading order, on both sides.
  let found = { dx: 0, dy: 0 }
  const at = symbols.findIndex((s) => s === BLOCK)
  if (at >= 0) {
    const outRow = Math.floor(at / w)
    const outCol = at % w
    outer: for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        if (rows[r][c] === '1') {
          found = {
            dx: outCol - (c + ETCH_PAD_COLS),
            dy: outRow - (r + ETCH_PAD_ROWS),
          }
          break outer
        }
      }
    }
  }
  offsets.set(key, found)
  return found
}

/**
 * Start the laser on a bitmap, in the given inks. Resolves once the engine
 * is ready, with the first frame stepped.
 */
export async function startEtch(
  rows: readonly string[],
  width: number,
  height: number,
  palette: string[],
  effect: string = DEFAULT_EFFECT,
): Promise<Etch> {
  const ttfx = await load()
  const { text, columns, lines } = toText(rows, width, height)
  const { dx, dy } = measureOffset(ttfx, text, columns, lines, rows, effect)
  const stepsPerSecond = STEPS[effect] ?? DEFAULT_STEPS

  const session = new ttfx.Session(
    text,
    effect,
    columns,
    lines,
    undefined,
    stepsPerSecond,
    palette.join(','),
    null,
  )

  // The frame exists only once the effect has stepped, and it may grow as
  // sparks fly, so the buffers are sized on every read.
  let w = 0
  let h = 0
  let symbols = new Uint32Array(0)
  let fg = new Uint32Array(0)
  let bg = new Uint32Array(0)
  let flags = new Uint8Array(0)
  const read = () => {
    w = session.width()
    h = session.height()
    const n = w * h
    if (symbols.length < n) {
      symbols = new Uint32Array(n)
      fg = new Uint32Array(n)
      bg = new Uint32Array(n)
      flags = new Uint8Array(n)
    }
    session.fill(symbols, fg, bg, flags)
  }

  let alive = session.step()
  read()
  let last = -1
  let owed = 0
  let doneAt = -1
  let settled = 0
  const stepMs = 1000 / stepsPerSecond

  return {
    advance(time) {
      if (last < 0) last = time
      if (alive) {
        // Steps owed since the last frame, capped so a tab coming back
        // from the background does not burn through the whole effect.
        owed = Math.min(owed + (time - last), stepMs * 40)
        last = time
        let moved = false
        while (owed >= stepMs && alive) {
          owed -= stepMs
          alive = session.step()
          moved = true
        }
        if (moved) read()
        if (alive) return true
        doneAt = time
      }
      settled = Math.min(1, (time - doneAt) / SETTLE_MS)
      return settled < 1
    },
    settle: () => settled,
    cells() {
      const out: EtchCell[] = []
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          const i = r * w + c
          const symbol = symbols[i]
          if (symbol === 32 || symbol === 0 || flags[i] & 32) continue
          out.push({
            col: c - ETCH_PAD_COLS - dx,
            row: r - ETCH_PAD_ROWS - dy,
            rgb: fg[i] & 0xffffff,
            symbol,
            ...describe(symbol),
          })
        }
      }
      return out
    },
    free() {
      alive = false
      session.free()
    },
  }
}

/**
 * The effect to play, from the address (?etch=beams) so every one of them
 * can be tried on the real page, else the default. Unknown names fall
 * back to the default rather than to an engine error.
 */
export function effectFromLocation(): string {
  try {
    const wanted = new URLSearchParams(window.location.search).get('etch')
    return wanted &&
      (wanted === 'random' || (EFFECTS as readonly string[]).includes(wanted))
      ? wanted
      : DEFAULT_EFFECT
  } catch {
    return DEFAULT_EFFECT
  }
}
