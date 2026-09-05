/**
 * The homepage track, heard by the field.
 *
 * Nothing is precomputed. When the reader presses play, the track streams
 * through the Web Audio analyser on its way to the
 * speakers, and every frame the field asks what is coming out right now:
 * thirty-two bands of the spectrum, and whether a beat just landed. So the
 * picture is the sound, whatever track is playing, and swapping the track
 * needs no other change. Browsers only allow this after a gesture, which
 * is why the field is calm until the button is pressed.
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

export type MusicState = 'paused' | 'loading' | 'playing' | 'failed'

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

let audio: HTMLAudioElement | null = null
let context: AudioContext | null = null
let analyser: AnalyserNode | null = null
let freq: Float32Array<ArrayBuffer> = new Float32Array(0)
let bins: Array<[from: number, to: number]> = []
let state: MusicState = 'paused'
/** Whether play has been pressed at all this visit. */
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
/** The low bands' loudness last frame, in dB, for the rise. */
const previous = new Float32Array(BANDS)
const history = new Float32Array(HISTORY)
let historyAt = 0
let fluxPeak = 1
let lastSampleAt = -1
let lastBeatAt = -Infinity
/** Last frame's rise, and whether it was still climbing: a beat is called
 *  on the frame after its peak, so a single hit is one beat, not two. */
let lastFlux = 0
let lastFluxMean = 0

function announce() {
  window.dispatchEvent(new CustomEvent(MUSIC_EVENT, { detail: state }))
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
    state = 'playing'
    announce()
  })
  audio.addEventListener('waiting', () => {
    if (state === 'playing') {
      state = 'loading'
      announce()
    }
  })
  audio.addEventListener('pause', () => {
    state = 'paused'
    announce()
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
  context.createMediaElementSource(audio).connect(analyser)
  analyser.connect(context.destination)
}

export type MusicSample = {
  /** The bands, 0..1, low to high. All zero while paused. */
  bands: Float32Array
  /** A beat that landed this frame, 0..1 by strength, else 0. */
  beat: number
}

const sample: MusicSample = { bands: new Float32Array(BANDS), beat: 0 }

export const music = {
  get state() {
    return state
  },
  get playing() {
    return state === 'playing' || state === 'loading'
  },
  get touched() {
    return touched
  },

  /** Start the sound. Must be called from a click or a key press. */
  async play() {
    touched = true
    try {
      wire()
      state = 'loading'
      announce()
      if (context!.state !== 'running') await context!.resume()
      await audio!.play()
    } catch {
      state = 'failed'
      announce()
    }
  },

  pause() {
    audio?.pause()
  },

  toggle() {
    if (this.playing) this.pause()
    else void this.play()
  },

  /** How far through the track, 0..1. */
  get progress() {
    if (!audio || !audio.duration) return 0
    return audio.currentTime / audio.duration
  },
  /** Seconds in, and seconds long. Zero until the track has loaded. */
  get time() {
    return audio?.currentTime ?? 0
  },
  get duration() {
    return audio?.duration || 0
  },
  /**
   * Jump to a point in the track, in seconds. Stops a touch short of the
   * end: the track loops, and landing on the very end wraps to the start.
   */
  seek(seconds: number) {
    if (!audio || !audio.duration) return
    audio.currentTime = Math.max(0, Math.min(audio.duration - 0.5, seconds))
  },

  /**
   * Four coarse levels for a small meter - bass, low mids, high mids,
   * treble - read straight from the analyser, apart from the field's own
   * sampling so the beat detector is left alone. Zero while paused.
   */
  meter(out: Float32Array) {
    if (!analyser || state !== 'playing') {
      out.fill(0)
      return
    }
    analyser.getFloatFrequencyData(freq)
    const per = BANDS / out.length
    for (let m = 0; m < out.length; m++) {
      let level = 0
      for (let b = Math.floor(m * per); b < Math.floor((m + 1) * per); b++) {
        const [from, to] = bins[b]
        let power = 0
        for (let k = from; k < to; k++)
          if (freq[k] > DB_FLOOR) power += 10 ** (freq[k] / 10)
        const db = power > 0 ? 10 * Math.log10(power / (to - from)) : DB_FLOOR
        const raw = Math.max(0, Math.min(1, (db - DB_FLOOR) / -DB_FLOOR))
        const span = Math.max(0.15, peak[b] - floor[b])
        level = Math.max(level, (raw - floor[b]) / span)
      }
      out[m] = Math.max(0, Math.min(1, level))
    }
  },

  /**
   * What the speakers are doing this frame. `now` is the rAF clock. Call
   * once per frame; the beat detector keeps state between calls.
   */
  sample(now: number): MusicSample {
    if (!analyser || state !== 'playing') {
      sample.bands.fill(0)
      sample.beat = 0
      lastSampleAt = -1
      return sample
    }
    // Exact decibels per bin, so a loud bass never clips flat.
    analyser.getFloatFrequencyData(freq)

    // Each band: the loudness of its bins in dB, placed between the
    // quietest and the loudest the band has recently been, so a bass-heavy
    // mix still shows its treble and a dense master leaves room to move.
    for (let b = 0; b < BANDS; b++) {
      const [from, to] = bins[b]
      let power = 0
      for (let k = from; k < to; k++) {
        const db = freq[k]
        if (db > DB_FLOOR) power += 10 ** (db / 10)
      }
      const db = power > 0 ? 10 * Math.log10(power / (to - from)) : DB_FLOOR
      const raw = Math.max(0, Math.min(1, (db - DB_FLOOR) / -DB_FLOOR))
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
    // The rise: how much louder the low end is than last frame, in the
    // same log terms the picture uses.
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
