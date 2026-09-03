import type { ReactNode, RefObject } from 'react'
import { SearchIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

/**
 * The one search field on the site. There were three hand-rolled copies with
 * different right padding, one stray corner radius, and a focus ring that
 * disagreed with every other control, so no two filter rows looked alike.
 *
 * It stands 40px like the buttons beside it, sets 16px text because anything
 * smaller makes iOS Safari zoom the page on focus, and puts the icon over the
 * input rather than beside it so the border tells the truth about the hit
 * area. Focus is the same accent outline the rest of the site uses.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  trailing,
  inputRef,
  onFocus,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** Names the field for screen readers; there is no visible label. */
  label: string
  /** Sits at the right edge, inside the field. Decorative or a real control. */
  trailing?: ReactNode
  /** For fields that open something on focus, like a results list. */
  onFocus?: () => void
  inputRef?: RefObject<HTMLInputElement | null>
  className?: string
}) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-text-muted" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        aria-label={label}
        spellCheck={false}
        autoComplete="off"
        className={cn(
          'h-10 w-full border border-border-strong bg-bg-deep pl-10 text-base text-text placeholder:text-text-muted',
          'transition-[border-color] duration-150 ease-out hover:border-border-strong',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          trailing ? 'pr-10' : 'pr-3',
        )}
      />
      {trailing ? (
        <div className="absolute top-1/2 right-2.5 -translate-y-1/2">
          {trailing}
        </div>
      ) : null}
    </div>
  )
}
