import { NOT_FOUND_HEIGHT, NOT_FOUND_WIDTH } from '@/data/not-found-bitmap'
import { cn } from '@/lib/utils'

/**
 * The brand marks, drawn in currentColor so they follow the active theme:
 * text-brand where they should carry the accent. The public SVGs they
 * replace are baked #9ece6a, which only Tokyo Night could wear.
 */

/** The square-spiral glyph from public/brand/omarchy-logo.svg, inlined. The
 *  favicon is drawn from this same path, so the two cannot drift apart. */
export const OMARCHY_MARK_PATH =
  'm1200 1200h-480v-80h400v-1040h-479.996v160h-400v720h720v-720h-80v-80h159.996v880h-400v160h-640v-1200h1200zm-1120-80h480v-80h-400l.004-400h-80.004zm0-560h80.004v-400h400v-80h-480.004z'

export function OmarchyMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 1200"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d={OMARCHY_MARK_PATH}
      />
    </svg>
  )
}

/**
 * The same glyph as five strokes, so the header can draw it on hover: the
 * frame, the two stems, and the inner spiral in one sweep out to its tail.
 * Every path is normalised to a length of 1 for the dash animation, which
 * lives in styles.css under "nav mark".
 */
export function OmarchyMarkDrawn({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 1200"
      fill="none"
      stroke="currentColor"
      strokeWidth="80"
      aria-hidden="true"
      className={cn('mark-draw', className)}
    >
      <path pathLength={1} d="M640 1160H40V40H1160V1160H720" />
      <path pathLength={1} d="M600 40V200" />
      <path pathLength={1} d="M640 200H200V1000H1000V200H880" />
      <path pathLength={1} d="M600 1160V1040" />
      <path pathLength={1} d="M40 600H200" />
    </svg>
  )
}

type WordmarkProps = {
  className?: string
  label?: string
  /** A CSS background-image to wear instead of the flat currentColor. */
  background?: string
  'data-hero-wordmark'?: boolean
}

/**
 * The pixel wordmark as a mask over currentColor. Masking the shipped SVG
 * keeps one source of truth for the 211 rects while letting the fill be a
 * theme token.
 */
export function OmarchyWordmark({
  className,
  label,
  background,
  ...rest
}: WordmarkProps) {
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
      style={{
        aspectRatio: '4131 / 950',
        backgroundColor: 'currentColor',
        backgroundImage: background,
        maskImage: 'url(/brand/omarchy-wordmark.svg)',
        maskRepeat: 'no-repeat',
        maskSize: '100% 100%',
        WebkitMaskImage: 'url(/brand/omarchy-wordmark.svg)',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskSize: '100% 100%',
      }}
      {...rest}
    />
  )
}

/**
 * NOT FOUND, in the wordmark's letterforms. Same construction as
 * OmarchyWordmark - a mask over currentColor - so the 404 wears whatever
 * the theme is wearing, and the two marks can never drift apart in
 * treatment. The cells come from [[not-found-bitmap]].
 */
export function NotFoundWordmark({ className, label, ...rest }: WordmarkProps) {
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
      style={{
        aspectRatio: `${NOT_FOUND_WIDTH * 51} / ${NOT_FOUND_HEIGHT * 50}`,
        backgroundColor: 'currentColor',
        maskImage: 'url(/brand/not-found-wordmark.svg)',
        maskRepeat: 'no-repeat',
        maskSize: '100% 100%',
        WebkitMaskImage: 'url(/brand/not-found-wordmark.svg)',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskSize: '100% 100%',
      }}
      {...rest}
    />
  )
}
