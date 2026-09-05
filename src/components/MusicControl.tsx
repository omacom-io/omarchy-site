import { useEffect, useRef, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { VolumeIcon, VolumeOffIcon } from '@/components/icons'
import { MUSIC_EVENT, TRACK, loadMusic, music } from '@/lib/music'
import type { MusicState } from '@/lib/music'

/** Bars in the little meter, and the pixel steps each can climb. */
const METER_BARS = 4
const METER_STEPS = 5

const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * The one control the track gets. The track is always going - muted from
 * the first paint, with the field moving to it - so the cover is the
 * sound button: muted, it wears the speaker-off mark and a pulsing ring
 * until the first press, so nobody misses that there is sound to be had;
 * unmuted, the mark only shows when the pointer or keyboard reaches it.
 * Beside it the title, who made it, a four-bar meter, and a progress line
 * along the foot of the card that is also where you move through the
 * track - a real range input, so it takes a drag, a tap, the arrow keys
 * and a screen reader alike, and the artist line shows the time while a
 * hand is on it.
 *
 * The sound belongs to the visit, not to a page - it keeps going through
 * scrolling and from page to page - so the control is pinned to the
 * window. It is always there on the home page. Anywhere else it appears
 * once the sound has been turned on and then stays, on or off, so the
 * track is never out of reach.
 */
export function MusicControl() {
  // Starts from what the sound is doing now, not from "muted": the
  // control can be mounted fresh while the sound is already on.
  const [state, setState] = useState<MusicState>(() => music.state)
  useEffect(() => {
    const onState = (event: Event) =>
      setState((event as CustomEvent<MusicState>).detail)
    window.addEventListener(MUSIC_EVENT, onState)
    void loadMusic()
    return () => window.removeEventListener(MUSIC_EVENT, onState)
  }, [])
  const on = state === 'playing' || state === 'loading'
  const home = useLocation({ select: (at) => at.pathname === '/' })

  // The progress line, the meter and the readout are driven straight from
  // the track each frame, outside React, so the card never re-renders for
  // them. While a hand is on the range, the range leads and the track
  // follows; otherwise the track leads.
  const line = useRef<HTMLSpanElement>(null)
  const range = useRef<HTMLInputElement>(null)
  const readout = useRef<HTMLSpanElement>(null)
  const bars = useRef<Array<HTMLSpanElement | null>>([])
  const scrubbing = useRef(false)
  useEffect(() => {
    const levels = new Float32Array(METER_BARS)
    const shown = new Float32Array(METER_BARS)
    let frame = 0
    const tick = () => {
      frame = requestAnimationFrame(tick)
      if (!scrubbing.current) {
        const at = music.progress
        if (line.current) line.current.style.transform = `scaleX(${at})`
        if (range.current) range.current.value = String(at * 1000)
        if (readout.current)
          readout.current.textContent = `${clock(music.time)} / ${clock(music.duration)}`
      }
      music.meter(levels)
      for (let i = 0; i < METER_BARS; i++) {
        const rise = levels[i] > shown[i]
        shown[i] += (levels[i] - shown[i]) * (rise ? 0.7 : 0.2)
        const bar = bars.current[i]
        if (bar)
          bar.style.height = `${Math.max(1, Math.round(shown[i] * METER_STEPS)) * 2}px`
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  /** The range moved, by hand or key: show it at once, and go there. */
  const onScrub = (value: number) => {
    const at = value / 1000
    if (line.current) line.current.style.transform = `scaleX(${at})`
    if (readout.current)
      readout.current.textContent = `${clock(at * music.duration)} / ${clock(music.duration)}`
    music.seek(at * music.duration)
  }

  if (!home && !music.touched) return null
  const title = TRACK.title.replace(/ \(.*\)$/, '')
  const untouched = !music.touched

  return (
    <div
      data-hero-quiet
      data-no-stamp
      className="group/card pointer-events-auto fixed bottom-5 left-5 z-(--z-dropdown) flex h-[46px] items-stretch border border-border-subtle bg-bg/85 supports-backdrop-filter:backdrop-blur-sm"
    >
      {/* The cover is the sound button. Muted it shows the speaker-off
          mark, and until the sound has been turned on once, its edge
          breathes in the brand ink. Once the sound is on, the mark shows only when the
          pointer is on the card or the button was reached by keyboard (a
          click leaves focus behind too, and that must not count). Touch
          screens have no hover, so there the mark stays. */}
      <button
        type="button"
        onClick={() => music.toggle()}
        aria-pressed={on}
        aria-label={on ? 'Turn the sound off' : 'Turn the sound on'}
        title={on ? 'Sound off' : 'Sound on'}
        className="relative size-11 shrink-0 self-center border-r border-border-subtle bg-cover bg-center text-white touch-manipulation focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        style={{ backgroundImage: `url(${TRACK.art})` }}
      >
        {untouched ? (
          <span
            aria-hidden="true"
            className="music-ring pointer-events-none absolute -inset-px border border-brand"
          />
        ) : null}
        <span
          className={
            'absolute inset-0 flex items-center justify-center bg-black/45 transition-opacity duration-150 ease-out ' +
            (on
              ? 'opacity-0 group-hover/card:opacity-100 group-has-[:focus-visible]/card:opacity-100 pointer-coarse:opacity-100'
              : 'opacity-100')
          }
        >
          {on ? (
            <VolumeIcon className="size-[18px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
          ) : (
            <VolumeOffIcon className="size-[18px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" />
          )}
        </span>
      </button>
      <a
        href={TRACK.radio}
        className="group flex flex-col justify-center pr-4 pl-3 leading-tight"
      >
        <span className="font-sans text-[12px] font-medium text-text transition-colors duration-150 ease-out group-hover:text-brand">
          {state === 'failed' ? 'The sound could not start' : title}
        </span>
        {/* The artist line doubles as the time readout while a hand or the
            pointer is on the bar. */}
        <span className="relative mt-0.5 font-mono text-[12px] text-text-secondary">
          <span className="transition-opacity duration-150 ease-out group-has-[input:hover]/card:opacity-0 group-has-[input:focus-visible]/card:opacity-0 group-has-[input:active]/card:opacity-0">
            {TRACK.artist}
          </span>
          <span
            ref={readout}
            aria-hidden="true"
            className="absolute inset-0 opacity-0 transition-opacity duration-150 ease-out group-has-[input:hover]/card:opacity-100 group-has-[input:focus-visible]/card:opacity-100 group-has-[input:active]/card:opacity-100"
          />
        </span>
      </a>
      {/* The meter: four bars of whole pixels, in the brand ink, moving
          with the track from the start. */}
      <span
        aria-hidden="true"
        className="mr-3 flex w-[18px] items-end gap-[2px] self-center"
        style={{ height: METER_STEPS * 2 + 2 }}
      >
        {Array.from({ length: METER_BARS }, (_, i) => (
          <span
            key={i}
            ref={(el) => {
              bars.current[i] = el
            }}
            className="block w-[3px] shrink-0 bg-brand"
            style={{ height: 2 }}
          />
        ))}
      </span>
      {/* Progress and seeking, along the foot of the card. The painted line
          is the span; the range on top of it is the control, with a hit
          area a good deal taller than the line it draws and no handle of
          its own: the end of the line is the handle. */}
      <span
        ref={line}
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-brand transition-[height] duration-150 ease-out group-hover/card:h-[4px] group-has-[:focus-visible]/card:h-[4px]"
        style={{ transform: 'scaleX(0)' }}
      />
      <input
        ref={range}
        type="range"
        min={0}
        max={1000}
        step={5}
        defaultValue={0}
        aria-label="Position in the track"
        onPointerDown={() => {
          scrubbing.current = true
        }}
        onPointerUp={() => {
          scrubbing.current = false
        }}
        onPointerCancel={() => {
          scrubbing.current = false
        }}
        onInput={(event) => onScrub(Number(event.currentTarget.value))}
        className="music-seek absolute inset-x-0 -bottom-[6px] h-[14px] w-full cursor-pointer touch-none appearance-none bg-transparent focus-visible:outline-none"
      />
    </div>
  )
}
