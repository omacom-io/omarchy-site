import { HeroPixelField } from './HeroPixelField'
import type { FieldGlyph } from './HeroPixelField'
import { cn } from '@/lib/utils'

type Props = {
  onPainted?: () => void
  /** The word the field resolves into. Defaults to the wordmark. */
  glyph?: FieldGlyph
  /** What a press on the word does. Defaults to the theme picker. */
  onGlyphPress?: () => void
}

/**
 * The hero backdrop. Both the drifting pixel field and the wordmark are
 * painted by one canvas on a single shared grid, so they stay aligned at
 * every viewport size. No WebGPU, no second layer, no resampling: the
 * wordmark is drawn as the bitmap it already is.
 */
export function HeroShader({ onPainted, glyph, onGlyphPress }: Props) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none"
    >
      <HeroPixelField
        onPainted={onPainted}
        glyph={glyph}
        onGlyphPress={onGlyphPress}
      />
    </div>
  )
}

/**
 * The same field with no wordmark in it: a ground that drifts, answers the
 * cursor and takes a stamp on a click, wherever a block of the page wants
 * the hero's surface under it. The host must be positioned and clipped.
 */
export function PixelBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 select-none',
        className,
      )}
    >
      <HeroPixelField variant="field" />
    </div>
  )
}
