import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BrushIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CrossIcon,
} from '@/components/icons'
import {
  HINT_KEY,
  OPEN_PICKER_EVENT,
  PICKER_STATE_EVENT,
  SITE_THEMES,
  applyTheme,
  paintFavicon,
  watchChrome,
  readTheme,
} from '@/lib/theme'
import { useIsNarrow } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

/**
 * The Omarchy theme browser, for the website. Press T and the same UI
 * Omarchy shows appears: a row of theme previews with the current one front
 * and center, the theme's name under it, arrows to walk the list. Every step
 * applies immediately, so the page behind the picker is the live preview,
 * exactly like the desktop re-theming behind Omarchy's own picker.
 */
/** Omarchy's card slant: a 2.5% lean, top edge shifted right of the bottom. */
const PARALLELOGRAM = 'polygon(2.5% 0%, 100% 0%, 97.5% 100%, 0% 100%)'

/**
 * The same parallelogram inset by a border width, in the SAME coordinate
 * box. Insetting via padding computed the inner slant on a smaller box,
 * which left the two edges non-parallel and the border visibly pinched
 * along the verticals. At this slant (under 2 degrees) the horizontal
 * inset of a slanted edge differs from the border width by under 0.2px,
 * so plain calc offsets are exact to the eye.
 */
const parallelogramInset = (b: string) =>
  `polygon(calc(2.5% + ${b}) ${b}, calc(100% - ${b}) ${b}, calc(97.5% - ${b}) calc(100% - ${b}), ${b} calc(100% - ${b}))`

/** True while the keystroke belongs to a field the reader is typing into. */
const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  if (!el?.tagName) return false
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  )
}

export function ThemePicker() {
  // A phone is portrait, so the deck is too: a landscape card in a portrait
  // window is a strip across the middle of it.
  const portrait = useIsNarrow()
  const [open, setOpen] = useState(false)
  // The picker arrives and leaves in one frame. A theme is something you
  // flick through, and a fade on each end put a beat between the keystroke
  // and the answer - long enough, pressed twice in a row, to feel like lag.
  const [index, setIndex] = useState(0)
  const [hint, setHint] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)
  /** Whether the trigger was wearing a focus ring when it opened the picker. */
  const restoreRing = useRef(false)

  const markHintSeen = useCallback(() => {
    setHint(false)
    try {
      localStorage.setItem(HINT_KEY, 'true')
    } catch {
      /* storage unavailable */
    }
  }, [])

  const openPicker = useCallback(() => {
    const current = readTheme()
    const at = SITE_THEMES.findIndex((t) => t.id === current)
    setIndex(at >= 0 ? at : 0)
    const trigger = document.activeElement as HTMLElement | null
    restoreFocus.current = trigger
    restoreRing.current = trigger?.matches(':focus-visible') ?? false
    setOpen(true)
    markHintSeen()
  }, [markHintSeen])

  const close = useCallback(() => {
    setOpen(false)
    // Focus goes back to whatever opened the picker, but the ring only
    // comes back if it was there to begin with. Choosing a theme with
    // Enter is a keypress, so without this the browser decides the
    // restored focus is keyboard-driven and paints a ring on a logo the
    // mouse user who clicked it is not even looking at.
    restoreFocus.current?.focus({ focusVisible: restoreRing.current })
  }, [])

  /** Where a finger went down, and how far it has travelled since. */
  const swipe = useRef({ id: -1, from: 0, moved: 0 })

  const step = useCallback((delta: number) => {
    setIndex((at) => {
      const next = (at + delta + SITE_THEMES.length) % SITE_THEMES.length
      applyTheme(SITE_THEMES[next].id)
      return next
    })
  }, [])

  // The entry point is T. Omarchy's own chord still works for anyone not on
  // Omarchy, but on Omarchy itself Hyprland binds it at the compositor and
  // consumes it before the browser sees a thing, so the one audience most
  // likely to try it is the one audience it can never reach.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const chord =
        event.code === 'Space' &&
        event.metaKey &&
        event.ctrlKey &&
        event.shiftKey
      // A bare T only: leave Cmd/Ctrl/Alt combinations to the browser, and
      // never fire while someone is typing, or searching the plugin
      // directory for a theme would open the picker on the first letter.
      const plainT =
        event.key.toLowerCase() === 't' &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTyping(event.target)
      if (!chord && !plainT) return
      event.preventDefault()
      if (open) close()
      else openPicker()
    }
    window.addEventListener('keydown', onKey)
    // Anything on the page can summon the picker (the footer line, the
    // welcome notice) without owning its state.
    const onOpenRequest = () => openPicker()
    window.addEventListener(OPEN_PICKER_EVENT, onOpenRequest)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_PICKER_EVENT, onOpenRequest)
    }
  }, [open, openPicker, close])

  // The stored theme is stamped before first paint by a script in <head>,
  // which never goes through applyTheme, so the tab icon needs painting
  // once on arrival as well as on every later change.
  useEffect(() => {
    paintFavicon()
    return watchChrome()
  }, [])

  // Broadcast open state so the hero field can disarm its logo hover
  // while the picker is up and not re-light it until the mouse moves.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(PICKER_STATE_EVENT, { detail: { open } }),
    )
  }, [open])

  // Warm the six preview images once the page is idle: they are only in
  // the DOM while the picker is open, so without this the first open
  // fetched and decoded ~2MB on the spot and visibly stuttered. Low
  // priority keeps the warm-up from competing with real content.
  useEffect(() => {
    let cancelled = false
    const warmed: HTMLImageElement[] = []
    const warm = () => {
      if (cancelled) return
      for (const theme of SITE_THEMES) {
        const img = new Image()
        img.fetchPriority = 'low'
        img.decoding = 'async'
        img.src = `/assets/images/theme-previews/${theme.id}.png`
        // Not every browser has decode(), whatever lib.dom promises.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        img.decode?.().catch(() => {})
        warmed.push(img)
      }
    }
    // Safari went years without requestIdleCallback and some WebViews still
    // have none, so the fallback is load-bearing however certain lib.dom is
    // that the callback is always there. Naming the optional type is a
    // truer fix than muting the rule that reads lib.dom and believes it.
    const idle =
      (window as { requestIdleCallback?: (cb: () => void) => void })
        .requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 1500))
    idle(() => warm())
    return () => {
      cancelled = true
    }
  }, [])

  // The welcome notice, the way Omarchy teaches its own hotkeys on first
  // boot: one card, top right, first visit only. It is also the way in on
  // touch screens, which have no right mouse button.
  useEffect(() => {
    let seen = false
    try {
      seen = localStorage.getItem(HINT_KEY) === 'true'
    } catch {
      /* storage unavailable: show nothing rather than nag every visit */
      seen = true
    }
    if (seen) return
    const timer = setTimeout(() => setHint(true), 1600)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      // IE/embedded WebViews deliver the legacy names, so accept both.
      if (event.key === 'ArrowLeft' || event.key === 'Left') {
        event.preventDefault()
        step(-1)
      } else if (event.key === 'ArrowRight' || event.key === 'Right') {
        event.preventDefault()
        step(1)
      } else if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, step, close])

  if (!open) {
    if (!hint) return null
    return (
      <div
        role="status"
        className="notice-in fixed top-[104px] right-4 z-(--z-dropdown) w-72 sm:top-[68px]"
      >
        <div className="ring-elevation relative bg-surface">
          <button
            type="button"
            onClick={openPicker}
            className="flex w-full items-start gap-3 p-4 pr-10 text-left transition-colors duration-150 ease-out hover:bg-surface-2"
          >
            <BrushIcon className="mt-0.5 size-5 shrink-0 text-brand" />
            <span>
              <span className="block font-sans text-sm font-medium text-text">
                Change the theme
              </span>
              <span className="mt-1 block text-[13px] leading-relaxed text-text-secondary">
                Press T, or tap here. Inside Omarchy it is Super + Ctrl + Shift
                + Space.
              </span>
            </span>
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={markHintSeen}
            className="absolute top-2 right-2 flex size-8 items-center justify-center text-text-muted transition-colors duration-150 ease-out hover:text-text"
          >
            <CrossIcon className="size-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Theme picker"
      tabIndex={-1}
      // Swipe walks the deck. Touch only: a mouse drag across the dimmer is
      // how someone closes this, and stepping the theme instead would be a
      // surprise. A swipe that has travelled is not a tap, so the click it
      // ends with is swallowed rather than allowed to keep a theme and close.
      onPointerDown={(event) => {
        if (event.pointerType !== 'touch') return
        swipe.current = { id: event.pointerId, from: event.clientX, moved: 0 }
      }}
      onPointerMove={(event) => {
        const drag = swipe.current
        if (event.pointerId !== drag.id) return
        drag.moved = event.clientX - drag.from
      }}
      onPointerUp={(event) => {
        const drag = swipe.current
        if (event.pointerId !== drag.id) return
        swipe.current = { ...drag, id: -1 }
        if (Math.abs(drag.moved) > 44) step(drag.moved < 0 ? 1 : -1)
      }}
      onClickCapture={(event) => {
        if (Math.abs(swipe.current.moved) <= 44) return
        swipe.current.moved = 0
        event.preventDefault()
        event.stopPropagation()
      }}
      className="fixed inset-0 z-(--z-modal) flex flex-col items-center justify-center outline-none"
    >
      {/* Dimmer, not a curtain: the page behind is the live preview - and
          it wears the same blur and fade the site's dialogs do, so opening
          the picker feels like opening any other layer here. The blur is
          slight on purpose: the page has to stay readable as a preview of
          the theme being chosen. */}
      <div
        aria-hidden="true"
        onClick={close}
        className={cn(
          'absolute inset-0 isolate bg-black/55 supports-backdrop-filter:backdrop-blur-xs',
        )}
      />

      {/* The deck arrives a beat after the dimmer and leaves with
          everything else. */}
      <div
        className={cn(
          'pointer-events-none relative flex w-full items-center justify-center',
        )}
      >
        {SITE_THEMES.map((theme, i) => {
          // Signed distance from the front card, wrapped so the fan is
          // symmetric: -2..3 for six themes.
          const raw = i - index
          const half = SITE_THEMES.length / 2
          const offset =
            raw > half
              ? raw - SITE_THEMES.length
              : raw < -half
                ? raw + SITE_THEMES.length
                : raw
          const depth = Math.abs(offset)
          if (depth > 2) return null
          // Neighbours tuck in close behind the front card and stay solid,
          // just darkened, the way the OS stacks its deck. The first term
          // compensates for the front card being scale 1 against the sides'
          // 0.88, so every card's visible sliver comes out the same width;
          // a flat step per depth did not, the outer gaps ran wider.
          const shift = offset === 0 ? 0 : Math.sign(offset) * (6 + depth * 12)
          return (
            <div
              key={theme.id}
              aria-hidden={offset !== 0}
              className="absolute w-[min(68vw,46rem)] sm:w-[min(72vw,46rem)] transition-transform duration-300 ease-out"
              style={{
                transform: `translateX(${shift}%) scale(${depth === 0 ? 1 : 0.88})`,
                zIndex: 10 - depth,
              }}
            >
              {/* The deck is a control, not a picture: a neighbour's visible
                  sliver walks the deck to it, and the front card keeps the
                  theme and closes. The stack itself stays click-through so
                  the space around the cards still reaches the dimmer. The
                  arrows and Esc do all of this too, which is why these carry
                  no tab stop of their own. */}
              <button
                type="button"
                tabIndex={-1}
                aria-hidden={offset !== 0}
                aria-label={
                  offset === 0
                    ? `Keep ${theme.name}`
                    : `Switch to ${theme.name}`
                }
                onClick={() => (offset === 0 ? close() : step(offset))}
                className="pointer-events-auto block w-full cursor-pointer [--card-dim:0.55] hover:[--card-dim:0.78]"
              >
                {/* The parallelogram is the card's shape, not a shear of the
                  screenshot. Three layers: the frame (an accent- or
                  gray-filled parallelogram), an inner parallelogram that
                  CROPS whatever is inside to the framed area, and the
                  screenshot, which may slide sideways within that crop.
                  Without the middle layer the slid image rode over the
                  frame's padding and erased the border on that side. */}
                <div
                  className={
                    'shadow-2xl ' + (depth === 0 ? 'bg-brand' : 'bg-zinc-500')
                  }
                  style={{ clipPath: PARALLELOGRAM }}
                >
                  {/* Dark matte behind the screenshot: sliding the image
                    sideways uncovers part of the frame's interior, and
                    without this the wrapper's border fill bled through as
                    a wide wedge of the frame color. */}
                  <div
                    className="bg-black"
                    style={{
                      clipPath: parallelogramInset(depth === 0 ? '3px' : '1px'),
                    }}
                  >
                    {/* Only a sliver of a neighbour shows, so its screenshot
                      slides sideways inside the frame to present its middle
                      in that sliver rather than a bare edge. */}
                    <img
                      src={`/assets/images/theme-previews/${theme.id}.png`}
                      alt={`${theme.name} theme preview`}
                      width={1800}
                      height={1012}
                      draggable={false}
                      // A dropped request on a flaky connection left the
                      // frame broken until a reload; one retry with a
                      // cache-buster heals it, and giving up after that
                      // keeps a dead connection from looping.
                      onError={(event) => {
                        const img = event.currentTarget
                        if (img.dataset.retried) return
                        img.dataset.retried = ''
                        window.setTimeout(() => {
                          img.src = `/assets/images/theme-previews/${theme.id}.png?retry`
                        }, 1000)
                      }}
                      className="w-full select-none object-cover transition-[transform,filter] duration-300 ease-out"
                      style={{
                        aspectRatio: portrait ? '4 / 5' : '1800 / 1012',
                        // The dim lives on the screenshot alone so the frame
                        // around a neighbour keeps its full strength, and it
                        // reads from a variable the card raises on hover, so
                        // pointing at a neighbour lights it toward the front.
                        filter:
                          depth === 0
                            ? undefined
                            : 'brightness(var(--card-dim))',
                        // The visible sliver sits at about 5% (left) or 95%
                        // (right) of a neighbour's card; 42% lands just shy of
                        // the screenshot's center, which reads best by eye.
                        transform:
                          offset === 0
                            ? undefined
                            : `translateX(${offset < 0 ? '-42%' : '42%'})`,
                      }}
                    />
                  </div>
                </div>
              </button>
            </div>
          )
        })}
        {/* Spacer that gives the absolute stack its height */}
        <div
          className="invisible w-[min(68vw,46rem)] sm:w-[min(72vw,46rem)]"
          style={{ aspectRatio: portrait ? '4 / 5' : '1800 / 1012' }}
        />
      </div>

      {/* The name is the plainest way to take the theme you are looking at:
          the front card keeps it and closes too, but the name is what you
          are reading when you decide, and on a phone it is the one target
          that is never half-covered by a neighbouring card. No plate: a
          filled box sat on top of the preview. The name is set in the
          theme's own two inks, and the dimmer decides which is which: the
          lighter one fills the letters and the darker one edges them. On a
          dark theme that is text on ground; on Rosé Pine and White it is
          the page's cream or white, edged in the theme's text colour, since
          dark letters would sink into the dimmer. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Keep ${SITE_THEMES[index].name}`}
        onClick={close}
        className={cn(
          'relative mt-1.5 cursor-pointer px-4 py-3.5 text-center transition-[filter] duration-150 ease-out hover:brightness-125',
        )}
      >
        <span
          className="block font-sans text-2xl font-semibold tracking-tight"
          style={{
            color: SITE_THEMES[index].light
              ? 'var(--color-bg)'
              : 'var(--color-text)',
            WebkitTextStroke: SITE_THEMES[index].light
              ? '2px var(--color-text)'
              : '2px var(--color-bg)',
            paintOrder: 'stroke fill',
          }}
        >
          {SITE_THEMES[index].name}
        </span>
      </button>

      <button
        type="button"
        aria-label="Previous theme"
        onClick={(e) => {
          e.stopPropagation()
          step(-1)
        }}
        className={cn(
          'absolute left-3 top-1/2 flex size-11 cursor-pointer -translate-y-1/2 items-center justify-center border border-border-subtle bg-bg text-text transition-colors duration-150 ease-out hover:bg-surface-2 sm:left-6',
        )}
      >
        <ChevronLeftIcon className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Next theme"
        onClick={(e) => {
          e.stopPropagation()
          step(1)
        }}
        className={cn(
          'absolute right-3 top-1/2 flex size-11 cursor-pointer -translate-y-1/2 items-center justify-center border border-border-subtle bg-bg text-text transition-colors duration-150 ease-out hover:bg-surface-2 sm:right-6',
        )}
      >
        <ChevronRightIcon className="size-5" />
      </button>
    </div>
  )
}
