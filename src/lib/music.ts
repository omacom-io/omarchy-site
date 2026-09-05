/**
 * The homepage track, and how the field hears it.
 *
 * It starts muted, and the field is already moving: browsers will not let
 * a page analyse audio before a gesture, so scripts/analyse-track.mjs
 * listened to the track once and wrote a timeline of sixteen bands and the
 * beats, and a silent clock runs through it from the moment the page
 * paints, looping. No audio is fetched for that.
 *
 * Turning the sound on loads the track, starts it where the clock is, and
 * from then on the sound itself is read through the Web Audio analyser on
 * its way to the speakers - thirty-two bands and a live beat detector - so
 * the picture is exactly what is playing. Turning it off again only turns
 * the volume down, after the analyser: the track keeps playing and the
 * sound is there again the moment it is asked for. With the sound off the
 * field goes back to the timeline, at the track's position, so it looks
 * the way the page opened; the live reading is for when it can be heard.
 */

export const MUSIC_EVENT = 'omarchy-music'

export const TRACK = {
  title: 'We Can Fix Everything (The Ultimate Machine)',
  artist: 'Kevin Koontz',
  /** Served from the site itself, from public/music. */
  src: '/music/kevin_koontz-we_can_fix_everything.mp3',
  /** The cover, 176px square: shown at 44 css px, sharp on dense screens. */
  art: '/music/kevin_koontz-we_can_fix_everything.webp',
  radio: 'https://radio.omarchy.org/',
}

/**
 * muted: the sound is off - off the timeline before the track has ever
 * been started, and off the live track after, at zero volume. loading:
 * the sound was asked for and is on its way. playing: the sound is on.
 * failed: the sound could not start; the timeline carries on.
 */
export type MusicState = 'muted' | 'loading' | 'playing' | 'failed'

export const BANDS = 32
const LOW_HZ = 50
const HIGH_HZ = 10000
const FFT_SIZE = 2048
/** Bands below this one count as the low end, where the beats live:
 *  up to about 365 Hz. */
const LOW_BANDS = 12
/** A beat must clear the recent average by this much... */
const BEAT_RATIO = 1.6
/** ...and be at least this share of the hardest hit of the last seconds. */
const BEAT_FLOOR = 0.3
/** How much of the hardest hit is kept each frame: about six seconds. */
const PEAK_MEMORY = 0.996
/** Decibels the picture spans, from silence to the loudest a band gets. */
const DB_FLOOR = -90
/** Two beats cannot land closer than this, in ms. */
const BEAT_GAP_MS = 220
/** Frames of onset history the threshold is judged against. */
const HISTORY = 48

type Timeline = {
  duration: number
  fps: number
  bands: number
  spectrum: string
  beats: Array<[at: number, strength: number]>
}

let timeline: Timeline | null = null
let frames: Uint8Array | null = null
let timelineLoading: Promise<void> | null = null
/** The silent clock: when position zero was, in performance.now() ms. A
 *  seek can put that before the page opened, so this is not a sign of
 *  anything; null is the clock not having started. */
let clockZero: number | null = null

let audio: HTMLAudioElement | null = null
let context: AudioContext | null = null
let analyser: AnalyserNode | null = null
/** The volume, after the analyser: what sound off turns down. */
let volume: GainNode | null = null
/** Whether the track is actually running, whatever the volume. */
let running = false
let freq: Float32Array<ArrayBuffer> = new Float32Array(0)
let bins: Array<[from: number, to: number]> = []
let state: MusicState = 'muted'
/** Whether the sound has ever been turned on this visit. */
let touched = false

// Per-band running floor and peak, so each band swings across its whole
// range whatever the mix: the floor creeps up towards the peak and drops
// at once to anything quieter; the peak drops slowly and jumps to anything
// louder. Then the onset detector's memory.
const floor = new Float32Array(BANDS).fill(0)
const peak = new Float32Array(BANDS).fill(0.3)
/** The raw low bands last frame: onsets are judged on the sound itself,
 *  not on the auto-ranged picture, which magnifies small changes. */
const rawNow = new Float32Array(BANDS)
const previous = new Float32Array(BANDS)
const history = new Float32Array(HISTORY)
let historyAt = 0
let fluxPeak = 1
let lastSampleAt = -1
let lastBeatAt = -Infinity
/** Last frame's rise: a beat is called on the frame after its peak, so a
 *  single hit is one beat, not two. */
let lastFlux = 0
let lastFluxMean = 0
/** Where the timeline was last read, for beats between reads. */
let timelineAt = -1
const meterBands = new Float32Array(BANDS)

function announce() {
  window.dispatchEvent(new CustomEvent(MUSIC_EVENT, { detail: state }))
}

/** Fetch the timeline once and start the silent clock. */
export function loadMusic(): Promise<void> {
  timelineLoading ??= import('@/data/track.json').then((mod) => {
    timeline = mod.default as Timeline
    const raw = atob(timeline.spectrum)
    frames = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) frames[i] = raw.charCodeAt(i)
    clockZero ??= performance.now()
  })
  return timelineLoading
}

/** Which analyser bins make up each band, spaced evenly in pitch. */
function layoutBands(sampleRate: number) {
  const binHz = sampleRate / FFT_SIZE
  const count = FFT_SIZE / 2
  bins = []
  for (let b = 0; b < BANDS; b++) {
    const lo = LOW_HZ * (HIGH_HZ / LOW_HZ) ** (b / BANDS)
    const hi = LOW_HZ * (HIGH_HZ / LOW_HZ) ** ((b + 1) / BANDS)
    const from = Math.min(count - 1, Math.max(1, Math.round(lo / binHz)))
    const to = Math.min(count, Math.max(from + 1, Math.round(hi / binHz)))
    bins.push([from, to])
  }
}

function wire() {
  if (audio) return
  audio = new Audio()
  // Cross-origin set before the source, so a track served from another
  // origin (the radio, say) still reaches the analyser; without this it
  // would hear silence. Harmless for the site's own file.
  audio.crossOrigin = 'anonymous'
  audio.loop = true
  audio.preload = 'auto'
  audio.src = TRACK.src
  audio.addEventListener('playing', () => {
    running = true
    if (state === 'loading') {
      state = 'playing'
      announce()
    }
  })
  audio.addEventListener('waiting', () => {
    if (state === 'playing') {
      state = 'loading'
      announce()
    }
  })
  audio.addEventListener('pause', () => {
    running = false
  })
  audio.addEventListener('error', () => {
    state = 'failed'
    announce()
  })

  context = new AudioContext()
  analyser = context.createAnalyser()
  analyser.fftSize = FFT_SIZE
  // No smoothing in the analyser: a kick's attack must arrive whole. The
  // picture is smoothed by whoever draws it.
  analyser.smoothingTimeConstant = 0
  freq = new Float32Array(analyser.frequencyBinCount)
  layoutBands(context.sampleRate)
  volume = context.createGain()
  context.createMediaElementSource(audio).connect(analyser)
  analyser.connect(volume)
  volume.connect(context.destination)
}

/** Fade the volume to a level over a few ms, so there is no click. */
function setVolume(level: number) {
  if (!context || !volume) return
  const now = context.currentTime
  volume.gain.cancelScheduledValues(now)
  volume.gain.setValueAtTime(volume.gain.value, now)
  volume.gain.linearRampToValueAtTime(level, now + 0.06)
}

/** Seconds into the track by the silent clock, looping. */
function clockPosition(now: number) {
  if (!timeline || clockZero === null) return 0
  return ((now - clockZero) / 1000) % timeline.duration
}

/** Whether the track itself is running, and so can be read live. */
const live = () => running && audio !== null && !audio.paused

export type MusicSample = {
  /** The bands, 0..1, low to high. Zero until the timeline has arrived. */
  bands: Float32Array
  /** A beat that landed this frame, 0..1 by strength, else 0. */
  beat: number
}

const sample: MusicSample = { bands: new Float32Array(BANDS), beat: 0 }

/** The timeline's bands at a position, spread from sixteen to thirty-two. */
function timelineBands(position: number, out: Float32Array) {
  if (!timeline || !frames) {
    out.fill(0)
    return
  }
  const n = timeline.bands
  const total = frames.length / n
  const f = position * timeline.fps
  const a = Math.floor(f) % total
  const b = (a + 1) % total
  const mix = f - Math.floor(f)
  for (let i = 0; i < BANDS; i++) {
    // Each output band sits between two timeline bands.
    const at = ((i + 0.5) / BANDS) * n - 0.5
    const lo = Math.max(0, Math.min(n - 1, Math.floor(at)))
    const hi = Math.min(n - 1, lo + 1)
    const t = Math.max(0, Math.min(1, at - lo))
    const early = frames[a * n + lo] * (1 - t) + frames[a * n + hi] * t
    const late = frames[b * n + lo] * (1 - t) + frames[b * n + hi] * t
    out[i] = (early * (1 - mix) + late * mix) / 255
  }
}

/** The strongest timeline beat in (from, to], or 0. Handles the loop. */
function timelineBeat(from: number, to: number): number {
  if (!timeline) return 0
  let best = 0
  const beats = timeline.beats
  const hit = (lo: number, hi: number) => {
    for (const [at, strength] of beats) {
      if (at > hi) break
      if (at > lo && strength > best) best = strength
    }
  }
  if (to >= from) hit(from, to)
  else {
    hit(from, timeline.duration)
    hit(-1, to)
  }
  return best
}

/** A band's level from the analyser's current frame, auto-ranged. */
function liveBand(b: number) {
  const [from, to] = bins[b]
  let power = 0
  for (let k = from; k < to; k++)
    if (freq[k] > DB_FLOOR) power += 10 ** (freq[k] / 10)
  const db = power > 0 ? 10 * Math.log10(power / (to - from)) : DB_FLOOR
  const raw = Math.max(0, Math.min(1, (db - DB_FLOOR) / -DB_FLOOR))
  return { raw, level: (raw - floor[b]) / Math.max(0.15, peak[b] - floor[b]) }
}

export const music = {
  get state() {
    return state
  },
  /** Whether the sound is on, or about to be. */
  get sounding() {
    return state === 'playing' || state === 'loading'
  },
  get touched() {
    return touched
  },

  /**
   * Turn the sound on. The first time, that loads the track and starts it
   * where the clock is; after that the track is already running and only
   * the volume comes back up. Must follow a gesture.
   */
  async unmute() {
    touched = true
    if (live()) {
      setVolume(1)
      state = 'playing'
      announce()
      return
    }
    try {
      if (!timeline) await loadMusic()
      wire()
      state = 'loading'
      announce()
      if (context!.state !== 'running') await context!.resume()
      setVolume(1)
      audio!.currentTime = clockPosition(performance.now())
      await audio!.play()
    } catch {
      // Turned off again before it started: that is not a failure.
      if (state === 'loading') {
        state = 'failed'
        announce()
      }
    }
  },

  /**
   * Sound off. If the track is running it keeps running, silently: the
   * field keeps hearing it, and the sound is one press away. If it was
   * still loading, that is called off and the silent clock, which never
   * stopped, carries on.
   */
  mute() {
    if (live()) setVolume(0)
    else audio?.pause()
    state = 'muted'
    announce()
  },

  toggle() {
    if (this.sounding) this.mute()
    else void this.unmute()
  },

  /** How far through the track, 0..1. */
  get progress() {
    if (!timeline) return 0
    return this.time / timeline.duration
  },
  /** Seconds in, and seconds long. */
  get time() {
    return live() ? audio!.currentTime : clockPosition(performance.now())
  },
  get duration() {
    return timeline?.duration ?? 0
  },
  /**
   * Jump to a point in the track, in seconds. Stops a touch short of the
   * end: the track loops, and landing on the very end wraps to the start.
   */
  seek(seconds: number) {
    if (!timeline) return
    const at = Math.max(0, Math.min(timeline.duration - 0.5, seconds))
    // The track itself if it is running, sound on or off; the silent
    // clock in any case, so the two agree if the sound stops.
    if (live()) audio!.currentTime = at
    clockZero = performance.now() - at * 1000
    timelineAt = at
  },

  /**
   * What the track is doing this frame: heard live when the sound is on,
   * read from the timeline when it is not. `now` is the rAF clock. Call
   * once per frame; the beat detector keeps state between calls.
   */
  sample(now: number): MusicSample {
    if (!live() || !this.sounding) {
      // The timeline, at wherever the track is. Beats are the ones between
      // the last read and this.
      const position = live() ? audio!.currentTime : clockPosition(now)
      timelineBands(position, sample.bands)
      sample.beat = timelineAt < 0 ? 0 : timelineBeat(timelineAt, position)
      timelineAt = position
      lastSampleAt = -1
      return sample
    }
    timelineAt = -1

    // Exact decibels per bin, so a loud bass never clips flat.
    analyser!.getFloatFrequencyData(freq)

    // Each band: the loudness of its bins in dB, placed between the
    // quietest and the loudest the band has recently been, so a bass-heavy
    // mix still shows its treble and a dense master leaves room to move.
    for (let b = 0; b < BANDS; b++) {
      const { raw } = liveBand(b)
      rawNow[b] = raw
      peak[b] = Math.max(peak[b] * 0.9993, raw, 0.2)
      floor[b] = Math.min(raw, floor[b] + (peak[b] - floor[b]) * 0.003)
      const span = Math.max(0.15, peak[b] - floor[b])
      sample.bands[b] = Math.max(0, Math.min(1, (raw - floor[b]) / span))
    }

    // A beat: the low end got louder since last frame by more than it has
    // been doing lately. After a gap in sampling (the tab was hidden, the
    // hero was scrolled away) the memory is stale, so it is rebuilt first.
    let beat = 0
    const stale = lastSampleAt < 0 || now - lastSampleAt > 200
    let flux = 0
    for (let b = 0; b < LOW_BANDS; b++) {
      flux += Math.max(0, rawNow[b] - previous[b])
      previous[b] = rawNow[b]
    }
    flux /= LOW_BANDS
    if (stale) {
      history.fill(0)
      flux = 0
      lastFlux = 0
    }
    let mean = 0
    for (let i = 0; i < HISTORY; i++) mean += history[i]
    mean /= HISTORY
    history[historyAt] = flux
    historyAt = (historyAt + 1) % HISTORY
    fluxPeak = Math.max(fluxPeak * PEAK_MEMORY, flux, 0.01)
    // Last frame's rise was a peak if this frame's is smaller. A peak that
    // stands well above the recent run, and is a real hit, is a beat.
    if (
      !stale &&
      lastFlux > flux &&
      lastFlux > lastFluxMean * BEAT_RATIO &&
      lastFlux > fluxPeak * BEAT_FLOOR &&
      now - lastBeatAt >= BEAT_GAP_MS
    ) {
      beat = Math.min(1, lastFlux / fluxPeak)
      lastBeatAt = now
    }
    lastFlux = flux
    lastFluxMean = mean
    lastSampleAt = now
    sample.beat = beat
    return sample
  },

  /**
   * Four coarse levels for a small meter - bass, low mids, high mids,
   * treble - from whichever source is current, without disturbing the
   * frame sampler above.
   */
  meter(out: Float32Array) {
    const per = BANDS / out.length
    if (!live() || !this.sounding) {
      timelineBands(this.time, meterBands)
      for (let m = 0; m < out.length; m++) {
        let level = 0
        for (let b = Math.floor(m * per); b < Math.floor((m + 1) * per); b++)
          level = Math.max(level, meterBands[b])
        out[m] = level
      }
      return
    }
    analyser!.getFloatFrequencyData(freq)
    for (let m = 0; m < out.length; m++) {
      let level = 0
      for (let b = Math.floor(m * per); b < Math.floor((m + 1) * per); b++)
        level = Math.max(level, liveBand(b).level)
      out[m] = Math.max(0, Math.min(1, level))
    }
  },
}

/** The audio clock, for the development-time sync check. */
export const musicDebug = import.meta.env.DEV
  ? {
      get time() {
        return audio?.currentTime ?? -1
      },
      get sampleRate() {
        return context?.sampleRate ?? 0
      },
      /** The onset detector's view of the last frame. */
      get onset() {
        return { flux: lastFlux, mean: lastFluxMean, peak: fluxPeak }
      },
    }
  : null
