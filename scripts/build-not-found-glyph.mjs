/**
 * Draws NOT FOUND in the wordmark's own hand, and writes it out as both a
 * bitmap the pixel field can punch itself around and an SVG the page can
 * wear as a mask - the same pair the wordmark ships as.
 *
 * OMARCHY only supplies O. N, T, F, U and D are cut here, following the
 * rules the seven existing letters keep between them:
 *
 *   - strokes are three cells wide, on a 16-row body (rows 1..16)
 *   - corners are cut on the diagonal, one cell per row, over two rows
 *   - crossbars are two rows sheared by one cell (H, R, A)
 *   - a terminal either tapers to a point going up (H, Y) or beaks
 *     inward going right (C)
 *   - the letter's rightmost stem loses its bottom-right corner, but only
 *     when a left stem holds the other side (A, R, H, M)
 *
 * There are no true diagonals anywhere in OMARCHY - even M is built from
 * three verticals under an apex - so N's diagonal is a stair on the same
 * one-cell rhythm the corners use, two rows to a tread.
 *
 * Run: node scripts/build-not-found-glyph.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const ROWS = 17 // rows 0..16; row 0 stays empty, as the body starts at 1
const box = (w) => Array.from({ length: ROWS }, () => Array(w).fill('0'))
const fill = (g, r0, r1, c0, c1) => {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) g[r][c] = '1'
}
const clear = (g, r0, r1, c0, c1) => {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) g[r][c] = '0'
}

// O, lifted cell for cell out of the wordmark rather than redrawn.
const wordmark = fs.readFileSync(
  path.join(root, 'src/data/wordmark-bitmap.ts'),
  'utf8',
)
const source = [...wordmark.matchAll(/'([01]{81})'/g)].map((m) => m[1])
const O = source.slice(0, ROWS).map((r) => r.slice(0, 9).split(''))

// N - two stems tapering up as H's do, with a stair between them, nearly as
// wide as M. A diagonal needs room: penned into a narrow counter it can only
// lean, and a lean between two bars reads as a bolt rather than as an N. So
// the stair runs the whole counter, leaving the left stem on the body's
// first row and arriving at the right stem two rows above the foot - which
// is where a diagonal meets its stem in most letters of this kind, and what
// keeps the foot the same shape as the other one. Eight columns over twelve
// rows is two rows to a tread, the same rhythm every chamfer here uses.
// Both feet are then cut the way M cuts its outer stems.
const N = box(14)
fill(N, 3, 16, 0, 2)
fill(N, 3, 16, 11, 13)
fill(N, 1, 1, 2, 2)
fill(N, 2, 2, 1, 2)
fill(N, 1, 1, 11, 11)
fill(N, 2, 2, 11, 12)
for (let i = 0; i < 6; i++) fill(N, 3 + i * 2, 4 + i * 2, 3 + i, 5 + i)
clear(N, 15, 15, 13, 13)
clear(N, 16, 16, 12, 13)
clear(N, 15, 15, 0, 0)
clear(N, 16, 16, 0, 1)

// T - a three-row bar, cut at both ends. A and R cut only their top left
// because their right side carries on down into a stem; T's bar ends in mid
// air on both sides, so it is cut symmetrically, the way O's crown is. The
// stem is left flush: the font only takes a bottom-right corner when a left
// stem balances it, and T has none.
const T = box(11)
fill(T, 1, 1, 2, 8)
fill(T, 2, 2, 1, 9)
fill(T, 3, 3, 0, 10)
fill(T, 4, 16, 4, 6)

// F - R's cut top, C's beak closing the arm, H's sheared crossbar.
const F = box(10)
fill(F, 1, 1, 3, 9)
fill(F, 2, 2, 2, 9)
fill(F, 3, 16, 1, 3)
fill(F, 3, 4, 7, 9)
fill(F, 5, 5, 7, 8)
fill(F, 6, 6, 7, 7)
fill(F, 8, 8, 1, 9)
fill(F, 9, 9, 1, 8)

// U - H's tapering top over O's bowl.
const U = box(9)
fill(U, 3, 14, 0, 2)
fill(U, 3, 14, 6, 8)
fill(U, 1, 1, 2, 2)
fill(U, 2, 2, 1, 2)
fill(U, 1, 1, 6, 6)
fill(U, 2, 2, 6, 7)
fill(U, 15, 15, 1, 7)
fill(U, 16, 16, 2, 6)

// D - O's bowl hung on a square stem. The bowl's corners are cut exactly
// where O cuts its own: the right edge reaches col 6 on the first row and
// col 7 on the second, meeting the stem on the third. Anything shorter and
// the bowl reads as a different curve from the O beside it.
const D = box(9)
fill(D, 3, 14, 0, 2)
fill(D, 3, 14, 6, 8)
fill(D, 1, 1, 0, 6)
fill(D, 2, 2, 0, 7)
fill(D, 15, 15, 0, 7)
fill(D, 16, 16, 0, 6)

const GLYPHS = { N, O, T, F, U, D }
// Spaced by eye, as OMARCHY is: its own gaps run 0, 1 and 2 cells.
const WORD = 'NOT FOUND'
const GAP = {}
const DEFAULT_GAP = 2
const WORD_SPACE = 5

const columns = []
for (let i = 0; i < WORD.length; i++) {
  const ch = WORD[i]
  if (ch === ' ') {
    for (let n = 0; n < WORD_SPACE; n++) columns.push(Array(ROWS).fill('0'))
    continue
  }
  const g = GLYPHS[ch]
  for (let c = 0; c < g[0].length; c++)
    columns.push(Array.from({ length: ROWS }, (_, r) => g[r][c]))
  const next = WORD[i + 1]
  if (next && next !== ' ')
    for (let n = 0; n < (GAP[i] ?? DEFAULT_GAP); n++)
      columns.push(Array(ROWS).fill('0'))
}

// Trim the empty rows off the top and bottom: nothing here reaches row 0 or
// descends, and a glyph with dead rows would sit off-centre in its slot.
const grid = Array.from({ length: ROWS }, (_, r) =>
  columns.map((col) => col[r]).join(''),
)
const first = grid.findIndex((r) => r.includes('1'))
const last = grid.findLastIndex((r) => r.includes('1'))
const rows = grid.slice(first, last + 1)
const W = rows[0].length
const H = rows.length

// The wordmark's cell: 51 units across, 50 down. Kept exactly, so this glyph
// and the field stay on one grid the way the wordmark does.
const CW = 51
const CH = 50
const rects = []
for (let r = 0; r < H; r++) {
  for (let c = 0; c < W; ) {
    if (rows[r][c] !== '1') { c++; continue }
    const start = c
    while (c < W && rows[r][c] === '1') c++
    rects.push(
      `<rect x="${start * CW}" y="${r * CH}" width="${(c - start) * CW}" height="${CH}"/>`,
    )
  }
}
fs.writeFileSync(
  path.join(root, 'public/brand/not-found-wordmark.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W * CW} ${H * CH}" width="${W * CW}" height="${H * CH}">` +
    `<g fill="#9ece6a" shape-rendering="crispEdges">${rects.join('')}</g></svg>\n`,
)

fs.writeFileSync(
  path.join(root, 'src/data/not-found-bitmap.ts'),
  `/**
 * NOT FOUND as a ${W}x${H} bitmap, in the wordmark's own letterforms. The 404
 * draws these cells on the same grid as its background field, exactly as the
 * hero does with [[wordmark-bitmap]], so glyph and field cannot fall out of
 * alignment.
 *
 * Generated. Regenerate with: node scripts/build-not-found-glyph.mjs
 */
export const NOT_FOUND_WIDTH = ${W}
export const NOT_FOUND_HEIGHT = ${H}

export const NOT_FOUND_ROWS = [
${rows.map((r) => `  '${r}',`).join('\n')}
]
`,
)

console.log(`${W} x ${H} cells, ${rects.length} rects`)
for (const r of rows) console.log('  ' + [...r].map((c) => (c === '1' ? '#' : '.')).join(''))
