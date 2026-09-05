/**
 * Section labels drawn in a 3x5 pixel font, the same idea the wordmark is
 * built on. Every glyph is five rows of three cells, rendered as hard
 * squares so the label reads as pixels rather than as small type.
 */

const GLYPHS: Record<string, string> = {
  A: '111 101 111 101 101',
  B: '110 101 110 101 110',
  C: '111 100 100 100 111',
  D: '110 101 101 101 110',
  E: '111 100 111 100 111',
  F: '111 100 111 100 100',
  G: '111 100 101 101 111',
  H: '101 101 111 101 101',
  I: '111 010 010 010 111',
  J: '001 001 001 101 111',
  K: '101 101 110 101 101',
  L: '100 100 100 100 111',
  M: '101 111 111 101 101',
  N: '110 101 101 101 101',
  O: '111 101 101 101 111',
  P: '111 101 111 100 100',
  Q: '111 101 101 111 001',
  R: '111 101 110 101 101',
  S: '111 100 111 001 111',
  T: '111 010 010 010 010',
  U: '101 101 101 101 111',
  V: '101 101 101 101 010',
  W: '101 101 111 111 101',
  X: '101 101 010 101 101',
  Y: '101 101 010 010 010',
  Z: '111 001 010 100 111',
  '0': '111 101 101 101 111',
  '1': '010 110 010 010 111',
  '2': '111 001 111 100 111',
  '3': '111 001 111 001 111',
  '4': '101 101 111 001 001',
  '5': '111 100 111 001 111',
  '6': '111 100 111 101 111',
  '7': '111 001 001 001 001',
  '8': '111 101 111 101 111',
  '9': '111 101 111 001 111',
  '.': '000 000 000 000 010',
  '/': '001 001 010 100 100',
}

const GLYPH_WIDTH = 3
const GLYPH_HEIGHT = 5
/** Blank columns between glyphs, and the width of a space character. */
const TRACKING = 1
const SPACE_WIDTH = 2

type Props = {
  text: string
  /** Size of one pixel, in CSS px. */
  cell?: number
  className?: string
}

export function PixelLabel({ text, cell = 3, className }: Props) {
  const chars = text.toUpperCase().split('')
  const rects: { x: number; y: number }[] = []
  let x = 0

  for (const char of chars) {
    if (char === ' ') {
      x += SPACE_WIDTH + TRACKING
      continue
    }
    const glyph = GLYPHS[char]
    if (!glyph) {
      x += GLYPH_WIDTH + TRACKING
      continue
    }
    const rows = glyph.split(' ')
    for (let row = 0; row < GLYPH_HEIGHT; row++) {
      for (let col = 0; col < GLYPH_WIDTH; col++) {
        if (rows[row][col] === '1') rects.push({ x: x + col, y: row })
      }
    }
    x += GLYPH_WIDTH + TRACKING
  }

  const width = Math.max(0, x - TRACKING)

  return (
    <svg
      role="img"
      aria-label={text}
      width={width * cell}
      height={GLYPH_HEIGHT * cell}
      viewBox={`0 0 ${width} ${GLYPH_HEIGHT}`}
      shapeRendering="crispEdges"
      fill="currentColor"
      className={className}
    >
      {rects.map((rect) => (
        <rect
          key={`${rect.x}-${rect.y}`}
          x={rect.x}
          y={rect.y}
          width={1}
          height={1}
        />
      ))}
    </svg>
  )
}
