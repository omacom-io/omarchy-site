#!/usr/bin/env node
/**
 * Listen to the track once, here, so the page can move to it before the
 * reader has clicked anything.
 *
 * Browsers will not let a page analyse audio until there has been a
 * gesture, and the homepage starts muted with the field already moving. So
 * the spectrum and the beats are worked out ahead of time and shipped as a
 * small timeline: sixteen bands, fifteen times a second, and the beats with
 * how hard each lands. Once the sound is on, the page hears the track live
 * instead (src/lib/music.ts) and this timeline is left behind.
 *
 *   node scripts/analyse-track.mjs public/music/<track>.mp3
 *
 * Writes src/data/track.json. Needs ffmpeg on the PATH.
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const [, , input] = process.argv
if (!input) {
  console.error('usage: analyse-track.mjs <track.mp3>')
  process.exit(1)
}

const RATE = 22050
const FPS = 15
const HOP = Math.round(RATE / FPS)
const N = 2048
const BANDS = 16
const LOW_HZ = 50
const HIGH_HZ = 10000

// ------------------------------------------------------------- decode
const tmp = mkdtempSync(path.join(tmpdir(), 'track-'))
const pcm = path.join(tmp, 'mono.f32')
execFileSync('ffmpeg', [
  '-v',
  'error',
  '-i',
  input,
  '-ac',
  '1',
  '-ar',
  String(RATE),
  '-f',
  'f32le',
  pcm,
])
const samples = new Float32Array(
  (await import('node:fs')).readFileSync(pcm).buffer,
)
rmSync(tmp, { recursive: true, force: true })
const duration = samples.length / RATE

// ---------------------------------------------------------------- fft
// Plain radix-2, in place, on the analysis window. Nothing fancy: the
// track is five minutes and this runs once.
const re = new Float32Array(N)
const im = new Float32Array(N)
const window = new Float32Array(N)
for (let i = 0; i < N; i++)
  window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
const rev = new Uint32Array(N)
for (let i = 0, bits = Math.log2(N); i < N; i++) {
  let r = 0
  for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b)
  rev[i] = r
}
function fft() {
  for (let i = 0; i < N; i++) {
    const j = rev[i]
    if (j > i) {
      let t = re[i]
      re[i] = re[j]
      re[j] = t
      t = im[i]
      im[i] = im[j]
      im[j] = t
    }
  }
  for (let size = 2; size <= N; size *= 2) {
    const half = size / 2
    const step = (-2 * Math.PI) / size
    for (let start = 0; start < N; start += size) {
      for (let k = 0; k < half; k++) {
        const a = step * k
        const wr = Math.cos(a)
        const wi = Math.sin(a)
        const i = start + k
        const j = i + half
        const tr = re[j] * wr - im[j] * wi
        const ti = re[j] * wi + im[j] * wr
        re[j] = re[i] - tr
        im[j] = im[i] - ti
        re[i] += tr
        im[i] += ti
      }
    }
  }
}

// Band edges, spaced evenly in pitch between the low and high limits.
const edges = []
for (let b = 0; b <= BANDS; b++)
  edges.push(LOW_HZ * (HIGH_HZ / LOW_HZ) ** (b / BANDS))
const binHz = RATE / N
const binOf = (hz) => Math.min(N / 2 - 1, Math.max(1, Math.round(hz / binHz)))

// ------------------------------------------------------------ frames
const frames = Math.floor((samples.length - N) / HOP)
const energy = new Float32Array(frames * BANDS)
const lowFlux = new Float32Array(frames)
let prevLow = new Float32Array(BANDS)
for (let f = 0; f < frames; f++) {
  const at = f * HOP
  for (let i = 0; i < N; i++) {
    re[i] = samples[at + i] * window[i]
    im[i] = 0
  }
  fft()
  const cur = new Float32Array(BANDS)
  for (let b = 0; b < BANDS; b++) {
    const from = binOf(edges[b])
    const to = Math.max(from + 1, binOf(edges[b + 1]))
    let sum = 0
    for (let k = from; k < to; k++) sum += re[k] * re[k] + im[k] * im[k]
    // Log-compressed: a little energy is already visible, and a wall of
    // it does not blow the top off.
    cur[b] = Math.log1p((sum / (to - from)) * 40)
    energy[f * BANDS + b] = cur[b]
  }
  // Onset strength: how much louder the low end got since the last frame.
  let flux = 0
  for (let b = 0; b < 6; b++) flux += Math.max(0, cur[b] - prevLow[b])
  lowFlux[f] = flux
  prevLow = cur
}

// Normalise each band to its own loud moments, so a quiet high end still
// moves, then pack to a byte.
const packed = new Uint8Array(frames * BANDS)
for (let b = 0; b < BANDS; b++) {
  const values = []
  for (let f = 0; f < frames; f++) values.push(energy[f * BANDS + b])
  values.sort((x, y) => x - y)
  const top = values[Math.floor(values.length * 0.985)] || 1
  const floor = values[Math.floor(values.length * 0.1)] || 0
  for (let f = 0; f < frames; f++) {
    const v = (energy[f * BANDS + b] - floor) / (top - floor || 1)
    packed[f * BANDS + b] = Math.round(Math.max(0, Math.min(1, v)) * 255)
  }
}

// ------------------------------------------------------------- beats
// A beat is a jump in low-end energy that stands well above what the last
// second or so has been doing, at least a quarter second after the last.
const beats = []
const WIN = FPS
let last = -Infinity
let peak = 0
for (let f = 0; f < frames; f++) peak = Math.max(peak, lowFlux[f])
for (let f = 1; f < frames - 1; f++) {
  let sum = 0
  let n = 0
  for (let k = Math.max(0, f - WIN); k < Math.min(frames, f + WIN); k++) {
    sum += lowFlux[k]
    n++
  }
  const mean = sum / n
  const v = lowFlux[f]
  // The window is centred N/2 samples after its start.
  const t = (f * HOP + N / 2) / RATE
  if (
    v > mean * 1.6 &&
    v >= lowFlux[f - 1] &&
    v > lowFlux[f + 1] &&
    v > peak * 0.12 &&
    t - last >= 0.25
  ) {
    beats.push([Math.round(t * 100) / 100, Math.round((v / peak) * 100) / 100])
    last = t
  }
}

const out = {
  duration: Math.round(duration * 100) / 100,
  fps: FPS,
  bands: BANDS,
  spectrum: Buffer.from(packed).toString('base64'),
  beats,
}
const target = path.resolve(process.env.OUT ?? 'src/data/track.json')
writeFileSync(target, JSON.stringify(out))
console.log(
  `${duration.toFixed(1)}s, ${frames} frames x ${BANDS} bands, ${beats.length} beats -> ${path.relative(process.cwd(), target)} (${Math.round(JSON.stringify(out).length / 1024)} KB)`,
)
