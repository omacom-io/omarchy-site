import { useEffect, useRef } from 'react'

/**
 * Types a phrase out, holds it, and backs up only as far as the next phrase
 * disagrees with it - the tail of a sentence whose opening stays put.
 *
 * Backing up to the point where two phrases diverge, rather than to nothing,
 * is what a person editing a line actually does: you do not delete a word you
 * are about to type again. Here three of the four tails open with the same
 * space, so the caret holds against it instead of closing up to the stem and
 * stepping straight back out.
 *
 * The text is written straight to the DOM rather than held in React state:
 * this ticks about twenty times a second and none of it is anything the rest
 * of the tree needs to know about. Cadence is the whole point of the effect -
 * a fixed interval reads as a machine, so each keystroke carries its own
 * delay, longer at the start of a word and at the end of a thought, with a
 * hesitation now and then. Deleting is a held key: fast and even.
 *
 * The block this sits in wants [data-typed-block]. Its height is measured
 * against the longest phrase and held there, so a line that wraps on one
 * phrase and not the next cannot shunt the page around.
 */

/** Base milliseconds per keystroke, plus up to this much again at random. */
const KEY_MS = 58
const KEY_JITTER = 60
/** A new word is where a typist's hands reset. */
const WORD_PAUSE = 95
/** Everyone slows into the end of a phrase. */
const ENDING_PAUSE = 70
/** How often a keystroke catches, and for how long. */
const HESITATE_ODDS = 0.07
const HESITATE_MS = 140
/** Deleting is one held key, so it is quick and perfectly even. */
const DELETE_MS = 27
/** The finished phrase sits there long enough to be read. */
const HOLD_MS = 2100
/** And it pauses where the phrases part company before typing on. */
const TURN_MS = 420

export function TypewriterTail({ phrases }: { phrases: readonly string[] }) {
  const text = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = text.current
    if (!el) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (still || phrases.length === 0) {
      el.textContent = phrases[0] ?? ''
      return
    }

    const host = el.parentElement
    const block = el.closest<HTMLElement>('[data-typed-block]')
    const after = (i: number) => (i + 1) % phrases.length
    /** How much of the front of these two the reader would not see change. */
    const shared = (a: string, b: string) => {
      let i = 0
      while (i < a.length && i < b.length && a[i] === b[i]) i++
      return i
    }

    let timer = 0
    let index = 0
    let length = 0
    let deleting = false
    let running = false

    /** Holds the block at its tallest phrase, so no phrase can resize it. */
    const reserve = () => {
      if (!block) return
      const before = el.textContent
      block.style.minHeight = ''
      let tallest = 0
      for (const phrase of phrases) {
        el.textContent = phrase
        tallest = Math.max(tallest, block.getBoundingClientRect().height)
      }
      el.textContent = before
      block.style.minHeight = `${Math.ceil(tallest)}px`
    }

    const wait = () => {
      const phrase = phrases[index]
      if (deleting) return DELETE_MS
      let ms = KEY_MS + Math.random() * KEY_JITTER
      if (phrase[length - 1] === ' ') ms += WORD_PAUSE
      if (length >= phrase.length - 2) ms += ENDING_PAUSE
      if (Math.random() < HESITATE_ODDS) ms += HESITATE_MS
      return ms
    }

    const step = () => {
      const phrase = phrases[index]
      el.textContent = phrase.slice(0, length)

      let next = wait()
      if (!deleting && length === phrase.length) {
        deleting = true
        next = HOLD_MS
      } else if (deleting && length === shared(phrase, phrases[after(index)])) {
        deleting = false
        index = after(index)
        next = TURN_MS
      } else {
        length += deleting ? -1 : 1
      }

      // The caret only blinks where a typist's hands are still.
      host?.setAttribute(
        'data-typing',
        next > HOLD_MS - 1 || next === TURN_MS ? '0' : '1',
      )
      timer = window.setTimeout(step, next)
    }

    const start = () => {
      if (running) return
      running = true
      step()
    }
    const stop = () => {
      running = false
      window.clearTimeout(timer)
    }

    // Nothing ticks while the line is off screen.
    const watching = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: '96px' },
    )

    let cancelled = false
    const begin = () => {
      if (cancelled) return
      reserve()
      watching.observe(block ?? el)
    }
    // Measured against the real webfont, or the reservation is a fallback's.
    // document.fonts is absent in some embedded browsers, whatever lib.dom
    // claims, and this runs before anything is painted.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (document.fonts?.ready) void document.fonts.ready.then(begin)
    else begin()

    const relayout = () => {
      if (running) reserve()
    }
    window.addEventListener('resize', relayout)
    return () => {
      cancelled = true
      stop()
      watching.disconnect()
      window.removeEventListener('resize', relayout)
      if (block) block.style.minHeight = ''
    }
  }, [phrases])

  return (
    <span data-typing="0">
      <span ref={text} />
      <span className="typed-caret" aria-hidden="true" />
    </span>
  )
}
