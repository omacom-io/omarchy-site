// Omarchy screensaver: ttfx at 120fps on a black terminal-sized canvas.
// Cell size is capped at the 18px JetBrains Mono cell the real saver uses,
// so the mark stays small and effects scatter into the surrounding black.

import init, { Session, effect_catalog } from '../wte/ttfx.js';
import { FONT_FAMILY, FONT_SIZE, paintFrame } from '../wte/paint.js';
import { createEffectPicker } from './screensaver-picker.js';

const WTE_WASM_URL = '/assets/js/wte/ttfx.wasm';
const FRAME_RATE = 120;
const FRAME_MS = 1000 / FRAME_RATE;
const MAX_CATCH_UP_MS = FRAME_MS * 4;
const PREFERRED_CELL_WIDTH = 11;
const STATIC_GREEN = 0x9ece6a;
const FONT_WAIT_MS = 1000;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function artFromPre(pre) {
  let text = pre.textContent ?? '';
  if (text.startsWith('\n')) text = text.slice(1);
  return text.replace(/\n+$/, '');
}

function measureArt(text) {
  const lines = text.split('\n');
  let columns = 1;
  for (const line of lines) {
    columns = Math.max(columns, [...line].length);
  }
  return { columns, rows: Math.max(1, lines.length) };
}

function terminalMetrics(cssWidth, cssHeight, art) {
  const { columns: artColumns, rows: artRows } = measureArt(art);
  const fitWidth = Math.max(1, Math.floor(cssWidth / artColumns));
  const fitHeight = Math.max(1, Math.floor(cssHeight / (artRows * 2)));
  const cellWidth = Math.max(1, Math.min(PREFERRED_CELL_WIDTH, fitWidth, fitHeight));
  const cellHeight = cellWidth * 2;
  return {
    cellWidth,
    cellHeight,
    fontSize: Math.max(1, Math.round(cellHeight / 1.2)),
    columns: Math.max(artColumns, Math.floor(cssWidth / cellWidth)),
    rows: Math.max(artRows, Math.floor(cssHeight / cellHeight)),
    cssWidth,
    cssHeight,
  };
}

function afterFonts() {
  if (document.fonts?.load == null) {
    return Promise.resolve();
  }
  return Promise.race([
    document.fonts.load(`${FONT_SIZE}px "JetBrains Mono"`).then(() => document.fonts.ready),
    new Promise((resolve) => {
      window.setTimeout(resolve, FONT_WAIT_MS);
    }),
  ]);
}

async function loadWasm() {
  const response = await fetch(WTE_WASM_URL);
  if (!response.ok) {
    throw new Error(`ttfx wasm ${response.status}`);
  }
  return response.arrayBuffer();
}

function catalogNames(json) {
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .filter((item) => item && typeof item.name === 'string')
    .map((item) => item.name);
}

function sizeCanvas(canvas, cssWidth, cssHeight) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
  canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2d canvas is unavailable');
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function staticFrame(metrics, art) {
  const { columns, rows } = metrics;
  const { columns: artColumns, rows: artRows } = measureArt(art);
  const lines = art.split('\n');
  const originCol = Math.floor((columns - artColumns) / 2);
  const originRow = Math.floor((rows - artRows) / 2);
  const count = columns * rows;
  const symbols = new Uint32Array(count).fill(0x20);
  const fg = new Uint32Array(count);
  const bg = new Uint32Array(count);
  const flags = new Uint8Array(count);
  for (let row = 0; row < artRows; row++) {
    const chars = [...(lines[row] ?? '')];
    for (let col = 0; col < chars.length; col++) {
      const x = originCol + col;
      const y = originRow + row;
      if (x < 0 || x >= columns || y < 0 || y >= rows) continue;
      const cp = chars[col].codePointAt(0);
      if (cp === 0x20) continue;
      const index = y * columns + x;
      symbols[index] = cp;
      fg[index] = STATIC_GREEN;
    }
  }
  return { symbols, fg, bg, flags, width: columns, height: rows };
}

function paintStatic(ctx, metrics, art) {
  const frame = staticFrame(metrics, art);
  paintFrame(
    ctx,
    metrics,
    frame.symbols,
    frame.fg,
    frame.bg,
    frame.flags,
    frame.width,
    frame.height,
    true,
    FONT_FAMILY,
  );
}

function isFullscreen() {
  return document.fullscreenElement != null || document.webkitFullscreenElement != null;
}

function toggleFullscreen() {
  const root = document.documentElement;
  if (isFullscreen()) {
    const exit = document.exitFullscreen ?? document.webkitExitFullscreen;
    if (typeof exit === 'function') void exit.call(document);
    return;
  }
  const request = root.requestFullscreen ?? root.webkitRequestFullscreen;
  if (typeof request !== 'function') return;
  try {
    const result = request.call(root);
    if (result && typeof result.catch === 'function') void result.catch(() => {});
  } catch {
  }
}

function markStatic() {
  document.documentElement.classList.add('screensaver--static');
}

function ready() {
  const canvas = document.getElementById('screensaver');
  const pre = document.getElementById('screensaver-art');
  if (!(canvas instanceof HTMLCanvasElement) || !(pre instanceof HTMLPreElement)) {
    return;
  }

  const input = artFromPre(pre);
  if (input.trim() === '') {
    markStatic();
    return;
  }

  const onKey = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key !== 'f' && event.key !== 'F') return;
    event.preventDefault();
    toggleFullscreen();
  };
  window.addEventListener('keydown', onKey);

  if (prefersReducedMotion()) {
    const paintNow = () => {
      const next = terminalMetrics(canvas.clientWidth, canvas.clientHeight, input);
      const nextCtx = sizeCanvas(canvas, next.cssWidth, next.cssHeight);
      paintStatic(nextCtx, next, input);
    };
    paintNow();
    new ResizeObserver(paintNow).observe(canvas);
    return;
  }

  let session = null;
  let metrics = null;
  let ctx = null;
  let symbols = new Uint32Array();
  let fg = new Uint32Array();
  let bg = new Uint32Array();
  let flags = new Uint8Array();
  let frameWidth = 0;
  let frameHeight = 0;
  let picker = null;
  let currentEffect = '';
  let acc = 0;
  let lastTs = 0;
  let raf = 0;
  let running = false;

  function stopSession() {
    session?.free();
    session = null;
  }

  function capture() {
    if (session == null) return;
    frameWidth = session.width();
    frameHeight = session.height();
    const count = frameWidth * frameHeight;
    if (symbols.length < count) {
      symbols = new Uint32Array(count);
      fg = new Uint32Array(count);
      bg = new Uint32Array(count);
      flags = new Uint8Array(count);
    }
    session.fill(symbols, fg, bg, flags);
  }

  function paint(now) {
    if (ctx == null || metrics == null) return;
    paintFrame(
      ctx,
      metrics,
      symbols,
      fg,
      bg,
      flags,
      frameWidth,
      frameHeight,
      Math.floor(now / 400) % 2 === 0,
      FONT_FAMILY,
    );
  }

  function startEffect(name) {
    if (metrics == null) return;
    stopSession();
    currentEffect = name;
    session = new Session(input, name, metrics.columns, metrics.rows, undefined, FRAME_RATE);
    if (session.step()) {
      capture();
    }
  }

  function layout() {
    const cssWidth = Math.max(1, canvas.clientWidth);
    const cssHeight = Math.max(1, canvas.clientHeight);
    metrics = terminalMetrics(cssWidth, cssHeight, input);
    ctx = sizeCanvas(canvas, cssWidth, cssHeight);
  }

  function tick(now) {
    if (!running) return;
    const elapsed = now - lastTs;
    acc = Math.min(MAX_CATCH_UP_MS, acc + Math.max(0, elapsed));
    lastTs = now;
    while (acc >= FRAME_MS) {
      acc -= FRAME_MS;
      if (session == null || !session.step()) {
        startEffect(picker.pick());
        break;
      }
    }
    capture();
    paint(now);
    raf = requestAnimationFrame(tick);
  }

  function play() {
    running = true;
    acc = 0;
    lastTs = performance.now();
    if (raf !== 0) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function pause() {
    running = false;
    if (raf !== 0) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function restart(nextName) {
    layout();
    startEffect(nextName ?? currentEffect);
    paint(performance.now());
    if (!document.hidden) play();
  }

  afterFonts()
    .then(loadWasm)
    .then((bytes) => init({ module_or_path: bytes }))
    .then(() => {
      const names = catalogNames(effect_catalog());
      if (names.length === 0) {
        throw new Error('effect catalog is empty');
      }
      picker = createEffectPicker(names);
      layout();
      startEffect(picker.pick());
      paint(performance.now());
      play();

      let resizeRaf = 0;
      const resize = new ResizeObserver(() => {
        if (resizeRaf !== 0) return;
        resizeRaf = requestAnimationFrame(() => {
          resizeRaf = 0;
          if (metrics == null) return;
          if (canvas.clientWidth === metrics.cssWidth && canvas.clientHeight === metrics.cssHeight) {
            return;
          }
          restart(currentEffect);
        });
      });
      resize.observe(canvas);

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          pause();
        } else if (session != null) {
          play();
        }
      });
    })
    .catch(() => {
      pause();
      stopSession();
      markStatic();
    });
}

ready();
