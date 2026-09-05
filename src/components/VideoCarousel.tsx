import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon } from '@/components/icons'
import { OmarchyMark } from '@/components/Brand'
import { Button } from '@/components/ui/button'
import { SectionActions, SectionHeading } from '@/components/SectionHeading'
import { cn } from '@/lib/utils'
import { useIsNarrow } from '@/lib/use-media-query'

export type CarouselVideo = {
  id: string
  title: string
  channel: string
  thumb: string
}

const GLIDE_MS = 420
const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3)
/** How far a flick's speed is projected past where the finger let go. */
const FLICK_MS = 150
/** A gesture turns the page once it has covered this much of a slide. */
const TURN_AT = 0.2
/** A pause before release means the drag was a placement, not a flick. */
const STALE_MS = 90
/** Movement under this is still a click, not a drag. */
const DRAG_SLOP = 6

/** Capture keeps a drag alive past the element's edges. It is a nicety, and
 *  a browser that refuses it must not take the whole gesture down with it. */
const capture = (el: Element, pointerId: number) => {
  try {
    el.setPointerCapture(pointerId)
  } catch {
    /* the drag still tracks through events on the element itself */
  }
}

/**
 * A full-bleed video rail, one big slide centered with its neighbours
 * peeking dimmed from the edges, the same way the themes rail runs the
 * whole page width. Swiping works natively through scroll-snap; the
 * arrows in the heading row page the same strip. Clicking a peeking
 * slide brings it to center; clicking the centered slide swaps its
 * thumbnail for the YouTube embed playing in place, and moving on
 * silences it so a video can never keep talking from off-screen.
 */
export function VideoCarousel({
  title,
  description,
  videos,
  level = 2,
}: {
  title: string
  description?: string
  videos: readonly CarouselVideo[]
  level?: 2 | 3
}) {
  // Narrow screens get the plain YouTube embed. The badge is a desktop
  // affordance: it exists so a hover can promise the click, and a thumbnail
  // you tap once to reveal a player you tap again is a step too many on a
  // phone.
  const narrow = useIsNarrow()
  const scroller = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const thumb = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState<string | null>(null)
  const glide = useRef(0)
  // Mouse drag state, with the pointer's recent speed so a release can be
  // read as a flick. Touch scrolls and snaps natively; this brings the
  // same gesture to the mouse, and clicks are swallowed after a real drag
  // so flinging the strip can never accidentally start a video.
  const drag = useRef({
    active: false,
    id: -1,
    startX: 0,
    startLeft: 0,
    moved: 0,
    startIndex: 0,
    lastX: 0,
    lastT: 0,
    speed: 0,
  })
  const thumbDrag = useRef({
    active: false,
    id: -1,
    startX: 0,
    startLeft: 0,
    room: 0,
    reach: 0,
  })

  const nearest = useCallback(() => {
    const el = scroller.current
    if (!el) return 0
    const center = el.scrollLeft + el.clientWidth / 2
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i] as HTMLElement
      const dist = Math.abs(child.offsetLeft + child.clientWidth / 2 - center)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    }
    return best
  }, [])

  const stopGlide = () => {
    if (glide.current) cancelAnimationFrame(glide.current)
    glide.current = 0
  }

  /**
   * Sizes and places the thumb. The rail is full-bleed, so its own
   * scrollbar would stretch the whole window; this one is drawn in the
   * content column and mirrors the rail's proportions instead.
   */
  const syncThumb = useCallback(() => {
    const el = scroller.current
    const bar = thumb.current
    if (!el || !bar) return
    const reach = el.scrollWidth - el.clientWidth
    const ratio = Math.min(1, el.clientWidth / el.scrollWidth)
    const progress = reach > 0 ? el.scrollLeft / reach : 0
    bar.style.width = `${ratio * 100}%`
    // Percentages here are of the thumb's own width, so the travel is
    // expressed relative to it rather than to the track.
    bar.style.transform = `translateX(${(progress * (1 - ratio) * 100) / ratio}%)`
  }, [])

  /**
   * Animates the strip to a slide and owns the motion for its whole
   * duration. Scroll-snap is suspended until the last frame: mandatory
   * snap resolves the instant it is re-applied, so restoring it while a
   * scroll is still running makes one gesture land twice, which is what
   * made dragging feel like the rail was throwing itself around.
   */
  const glideTo = useCallback(
    (i: number) => {
      const el = scroller.current
      const slide = el?.children[i] as HTMLElement | undefined
      if (!el || !slide) return
      stopGlide()
      setIndex(i)
      const from = el.scrollLeft
      const to = Math.max(
        0,
        Math.min(
          el.scrollWidth - el.clientWidth,
          slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2,
        ),
      )
      const still = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      if (still || Math.abs(to - from) < 1) {
        el.scrollLeft = to
        el.style.scrollSnapType = ''
        return
      }
      el.style.scrollSnapType = 'none'
      // The clock starts on the first frame, not at the click. A rAF callback
      // can be handed the timestamp of the frame the click was processed in,
      // which is earlier than performance.now() was when the click arrived.
      // That made t negative, and this ease is well under zero for negative
      // t (-0.33 at t = -0.1), so the rail jumped a third of the way
      // backwards before the next frame corrected it.
      let start: number | null = null
      const frame = (now: number) => {
        if (start === null) start = now
        const t = Math.min(1, Math.max(0, (now - start) / GLIDE_MS))
        el.scrollLeft = from + (to - from) * EASE_OUT(t)
        if (t < 1) {
          glide.current = requestAnimationFrame(frame)
          return
        }
        glide.current = 0
        el.style.scrollSnapType = ''
      }
      glide.current = requestAnimationFrame(frame)
    },
    [videos],
  )

  const goTo = (i: number) => glideTo((i + videos.length) % videos.length)

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    const el = scroller.current
    if (!el) return
    stopGlide()
    drag.current = {
      active: true,
      id: e.pointerId,
      startX: e.clientX,
      startLeft: el.scrollLeft,
      moved: 0,
      startIndex: nearest(),
      lastX: e.clientX,
      lastT: performance.now(),
      speed: 0,
    }
    // Snap fights direct scrollLeft writes; suspend it for the drag.
    el.style.scrollSnapType = 'none'
    // Capture is deliberately NOT taken here. A captured pointer retargets
    // the click that follows to the capturing element, which swallowed
    // every press on the play button; the rail takes it only once the
    // pointer has moved far enough to be a drag rather than a click.
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d.active || e.pointerId !== d.id) return
    const el = scroller.current
    if (!el) return
    const now = performance.now()
    const elapsed = now - d.lastT
    if (elapsed > 0) {
      const sample = (e.clientX - d.lastX) / elapsed
      d.speed = d.speed * 0.6 + sample * 0.4
    }
    d.lastX = e.clientX
    d.lastT = now
    const dx = e.clientX - d.startX
    const wasClick = d.moved <= DRAG_SLOP
    d.moved = Math.max(d.moved, Math.abs(dx))
    // Past the slop this is a drag, so take the pointer and let it run off
    // the rail's edges. Before that it may still turn out to be a click.
    if (wasClick && d.moved > DRAG_SLOP) capture(el, d.id)
    el.scrollLeft = d.startLeft - dx
  }

  const endDrag = () => {
    const d = drag.current
    if (!d.active) return
    d.active = false
    const el = scroller.current
    if (!el) return
    const first = el.children[0] as HTMLElement | undefined
    const second = el.children[1] as HTMLElement | undefined
    const step =
      first && second
        ? second.offsetLeft - first.offsetLeft
        : el.clientWidth || 1
    // Where the strip would coast to if it kept the speed it was released
    // at. A quick flick turns the page from anywhere; a slow drag has to
    // actually carry the slide most of the way, and a pause before letting
    // go means the position alone decides.
    const coasting = performance.now() - d.lastT < STALE_MS
    const travelled =
      el.scrollLeft - d.startLeft + (coasting ? -d.speed * FLICK_MS : 0)
    const turn = step * TURN_AT
    const next =
      travelled > turn
        ? d.startIndex + 1
        : travelled < -turn
          ? d.startIndex - 1
          : d.startIndex
    glideTo(Math.max(0, Math.min(videos.length - 1, next)))
  }

  const onClickCapture = (e: React.MouseEvent) => {
    // A drag is not a click: swallow it so nothing plays or jumps.
    if (drag.current.moved > DRAG_SLOP) {
      e.preventDefault()
      e.stopPropagation()
      drag.current.moved = 0
    }
  }

  const onThumbDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const el = scroller.current
    const rail = track.current
    const bar = thumb.current
    if (!el || !rail || !bar) return
    e.preventDefault()
    stopGlide()
    el.style.scrollSnapType = 'none'
    const room = rail.clientWidth - bar.clientWidth
    const reach = el.scrollWidth - el.clientWidth
    thumbDrag.current = {
      active: true,
      id: e.pointerId,
      startX: e.clientX,
      startLeft: el.scrollLeft,
      room,
      reach,
    }
    capture(bar, e.pointerId)
  }

  const onThumbMove = (e: React.PointerEvent) => {
    const d = thumbDrag.current
    const el = scroller.current
    if (!d.active || e.pointerId !== d.id || !el || d.room <= 0) return
    el.scrollLeft = d.startLeft + ((e.clientX - d.startX) * d.reach) / d.room
  }

  const onThumbUp = () => {
    if (!thumbDrag.current.active) return
    thumbDrag.current.active = false
    // Let go on the bar and the rail settles on a slide, the same as a
    // drag on the videos themselves.
    glideTo(nearest())
  }

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    syncThumb()
    // Browsers restore a scroller's position across a reload, so the rail
    // can come back on a different slide than the one this starts on.
    setIndex(nearest())
    const sizes = new ResizeObserver(syncThumb)
    sizes.observe(el)
    // The thumb tracks the scroll itself, on a native listener: scroll does
    // not bubble, React re-dispatches it from the root, and a rail that a
    // finger throws is exactly where that is least worth relying on. Which
    // slide is current is settled separately, by the observer below.
    el.addEventListener('scroll', syncThumb, { passive: true })

    // Which slide is current is read from how much of it the rail can see,
    // not from the scroll position. A touch swipe hands its scrolling to the
    // browser - momentum, then snap - and the events that come back from
    // that are not something to rebuild a position from; this is told
    // directly, by the same machinery that drives the scrolling.
    const seen = new Map<number, number>()
    const slides = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const at = (entry.target as HTMLElement).dataset.slide
          if (at !== undefined) seen.set(Number(at), entry.intersectionRatio)
        }
        // A glide already knows where it is going, and would otherwise be
        // contradicted by every slide it passes over.
        if (glide.current) return
        let best = 0
        let most = -1
        seen.forEach((ratio, at) => {
          if (ratio > most) {
            most = ratio
            best = at
          }
        })
        setIndex(best)
      },
      { root: el, threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    for (const slide of el.children) slides.observe(slide)

    return () => {
      sizes.disconnect()
      slides.disconnect()
      el.removeEventListener('scroll', syncThumb)
      stopGlide()
    }
  }, [syncThumb, nearest, videos])

  // Leaving a slide silences it, however you left.
  useEffect(() => {
    setPlaying((current) =>
      current && current !== videos[index]?.id ? null : current,
    )
  }, [index, videos])

  const arrows = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label="Previous video"
        onClick={() => goTo(index - 1)}
      >
        <ChevronLeftIcon className="size-5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Next video"
        onClick={() => goTo(index + 1)}
      >
        <ChevronRightIcon className="size-5" />
      </Button>
    </div>
  )

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          title={title}
          description={description}
          level={level}
          action={arrows}
        />
      </div>

      <div
        ref={scroller}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        className="rail-bare rail-column mt-10 flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto select-none active:cursor-grabbing motion-reduce:scroll-auto"
        aria-roledescription="carousel"
        aria-label={title}
      >
        {videos.map((video, i) => (
          <div
            key={video.id}
            className={cn(
              'w-full shrink-0 snap-center transition-[opacity,filter] duration-300 ease-out',
              i !== index && 'opacity-40 brightness-75',
            )}
            data-slide={i}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${videos.length}: ${video.title}`}
          >
            {narrow || playing === video.id ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.id}${
                  playing === video.id ? '?autoplay=1' : ''
                }`}
                title={`${video.title} by ${video.channel}`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                loading="lazy"
                className="img-outlined aspect-video w-full"
              />
            ) : (
              <button
                type="button"
                onClick={() => (i === index ? setPlaying(video.id) : goTo(i))}
                // A thumbnail is something you drag; a button would otherwise
                // claim the pointer cursor across the whole rail and leave
                // grab showing only in the gaps. Only the play badge asks
                // to be clicked, so only it carries the pointer.
                className="group relative block w-full cursor-grab text-left active:cursor-grabbing"
                aria-label={
                  i === index
                    ? `Play: ${video.title} by ${video.channel}`
                    : `Show: ${video.title} by ${video.channel}`
                }
              >
                <img
                  src={video.thumb}
                  alt=""
                  width={1280}
                  height={720}
                  loading="lazy"
                  fetchPriority="low"
                  decoding="async"
                  draggable={false}
                  className="img-outlined aspect-video w-full object-cover"
                />
                {i === index ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    {/* The mark is already a frame: its spiral leaves the
                        middle nine of its fifteen cells hollow, so the play
                        glyph sits inside the logo. Both draw in currentColor
                        and there is nothing behind them, so the badge is one
                        accent-colored object rather than a glyph on a plate,
                        and a single shadow lifts the whole of it off the
                        thumbnail. At 75px a cell is exactly 5px, and nothing
                        scales on hover, which would land the mark's edges
                        between pixels. At rest the badge sits a little faded
                        into the still, and hovering the thumbnail brings it
                        back to full colour; on touch, where nothing hovers,
                        it stays at full. */}
                    <span className="relative flex size-[75px] cursor-pointer items-center justify-center text-brand drop-shadow-[0_1px_6px_rgb(0_0_0/0.7)] transition-opacity duration-200 ease-out [@media(hover:hover)]:opacity-60 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-visible:opacity-100">
                      <OmarchyMark className="absolute inset-0 size-full" />
                      <PlayIcon className="relative size-[25px]" />
                    </span>
                  </span>
                ) : null}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-12">
                  <span className="block font-sans text-base font-medium text-white">
                    {video.title}
                  </span>
                  <span className="mt-0.5 block font-mono text-[13px] text-white/70">
                    {video.channel}
                  </span>
                </span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* The rail's scrollbar, drawn here so it measures the content
          column rather than the window the rail bleeds across. */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div
          ref={track}
          aria-hidden="true"
          className="mt-5 h-2 bg-border-subtle/50"
        >
          <div
            ref={thumb}
            onPointerDown={onThumbDown}
            onPointerMove={onThumbMove}
            onPointerUp={onThumbUp}
            onPointerCancel={onThumbUp}
            className="h-full cursor-grab bg-brand transition-colors duration-150 ease-out hover:bg-(--t-field-hover) active:cursor-grabbing active:bg-(--t-field-crest)"
          />
        </div>
        {/* On a phone the slides are players, and a player answers a touch
            itself rather than passing it to the rail underneath, so these
            stop being a shortcut and become the way through. */}
        <SectionActions>{arrows}</SectionActions>
      </div>
    </>
  )
}
