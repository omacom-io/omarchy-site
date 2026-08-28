import initTtfx, { Session, effectCatalog } from '../vendor/ttfx/ttfx-wasm.js';

/**
 * Browser pipeline for the terminal-oriented ttfx engine:
 *
 *   static <pre> text
 *          |
 *          v
 *   ttfx/WASM Session -- advance() -> symbols + colors + style flags
 *                                          |
 *                                          v
 *                                      paintFrame()
 *                                          |
 *                                          v
 *                                        canvas
 *
 * WASM owns the effect simulation. JavaScript owns browser timing, drawing,
 * resize, visibility and replay. The <pre> remains the layout reference and the
 * fallback when animation is unavailable.
 */

const EFFECT = 'laseretch';
const EFFECT_PADDING_ROWS = 4;
const FRAME_RATE = 120; // Virtual frame rate passed to the ttfx engine.
const PLAYBACK_RATE = 2.5; // Roughly 5.2 seconds, matching the installer more closely.
const MAX_FRAME_DELTA = 50; // Prefer smooth playback over large catch-up bursts.
const REPEAT_DELAY = 5000;
const LOGO_COLOR = '\u001b[38;2;158;206;106m';
const ANSI_RESET = '\u001b[0m';
const colorCache = new Map([[0, '#c8c8c8']]);

/**
 * Special canvas shapes for Unicode block characters:
 *
 *   WASM returns "▄"
 *          |
 *          v
 *   paintFrame() finds its cell
 *          |
 *          v
 *   drawGlyph() reads blockGlyphs['▄']
 *          |
 *          v
 *   [0, .5, 1, .5]             [left, top, width, height]
 *          |
 *          v
 *      +---------+
 *      |         |
 *      +---------+
 *      |#########|  <- lower half is painted with fillRect()
 *      +---------+
 *
 * Rectangle values run from 0 to 1 as fractions of one terminal cell. Entries
 * may contain multiple rectangles, as with the diagonal quadrants in ▚ and ▞.
 *
 * This table is not a whitelist:
 *
 *   █ ▄ ▀ and listed blocks     -> exact rectangles with fillRect()
 *   letters, /, \, *, etc.      -> configured font with fillText()
 *   emoji, Braille, box drawing -> configured font with fillText()
 *   ▁ ▂ ▃ or ░ ▒ ▓              -> fillText(); add shapes only if seams appear
 *
 * blockGlyphs is merely a visual optimization for the block characters used
 * by the Omarchy logo. Most other text art works without changing it.
 */
const blockGlyphs = {
  '█': [[0, 0, 1, 1]],
  '▀': [[0, 0, 1, .5]],
  '▄': [[0, .5, 1, .5]],
  '▌': [[0, 0, .5, 1]],
  '▐': [[.5, 0, .5, 1]],
  '▖': [[0, .5, .5, .5]],
  '▗': [[.5, .5, .5, .5]],
  '▘': [[0, 0, .5, .5]],
  '▝': [[.5, 0, .5, .5]],
  '▚': [[0, 0, .5, .5], [.5, .5, .5, .5]],
  '▞': [[.5, 0, .5, .5], [0, .5, .5, .5]],
  '▛': [[0, 0, 1, .5], [0, .5, .5, .5]],
  '▜': [[0, 0, 1, .5], [.5, .5, .5, .5]],
  '▙': [[0, 0, .5, 1], [.5, .5, .5, .5]],
  '▟': [[.5, 0, .5, 1], [0, .5, .5, .5]],
};

function inputDimensions(input) {

  var lines = input.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');

  return {
    columns: Math.max(1, ...lines.map(line => Array.from(line).length)),
    rows: Math.max(1, lines.length),
  };

}

function configureCanvas(canvas, fallback, input) {

  // Mirror the responsive <pre> cell geometry and add room for laser particles.
  // The backing bitmap is HiDPI while all drawing coordinates remain CSS pixels.
  var pixelRatio = Math.min(Math.max(1, window.devicePixelRatio || 1), 2);
  var bounds = fallback.getBoundingClientRect();
  var source = inputDimensions(input);
  var cellWidth = bounds.width / source.columns;
  var cellHeight = bounds.height / source.rows;
  var rows = source.rows + EFFECT_PADDING_ROWS;
  var cssWidth = Math.max(1, bounds.width);
  var cssHeight = Math.max(1, rows * cellHeight);

  canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
  canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.style.top = `${-Math.floor(EFFECT_PADDING_ROWS / 2) * cellHeight}px`;

  var context = canvas.getContext('2d', { alpha: true });
  if(!context) throw new Error('2D canvas is unavailable');
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  var style = window.getComputedStyle(fallback);
  var fontSize = parseFloat(style.fontSize);
  var fontFamily = style.fontFamily;

  return {
    context: context,
    cssWidth: cssWidth,
    cssHeight: cssHeight,
    cellWidth: cellWidth,
    cellHeight: cellHeight,
    fonts: [
      `400 ${fontSize}px ${fontFamily}`,
      `700 ${fontSize}px ${fontFamily}`,
      `italic 400 ${fontSize}px ${fontFamily}`,
      `italic 700 ${fontSize}px ${fontFamily}`,
    ],
    drawing: {
      fill: null,
      font: null,
    },
    columns: source.columns,
    rows: rows,
  };

}

function color(value) {

  value ||= 0;

  var cached = colorCache.get(value);

  if(!cached) {

    cached = `#${(value & 0xffffff).toString(16).padStart(6, '0')}`;
    colorCache.set(value, cached);

  }

  return cached;

}

function setFill(metrics, fill) {

  if(metrics.drawing.fill == fill) return;

  metrics.context.fillStyle = fill;
  metrics.drawing.fill = fill;

}

function drawGlyph(context, symbol, x, y, metrics, fill, italic, bold) {

  var blocks = blockGlyphs[symbol];

  if(blocks) {

    setFill(metrics, fill);

    for(var block of blocks) {

      var [left, top, width, height] = block;

      context.fillRect(
        x + left * metrics.cellWidth,
        y + top * metrics.cellHeight,
        Math.max(1, width * metrics.cellWidth),
        Math.max(1, height * metrics.cellHeight)
      );

    }

    return;

  }

  var font = metrics.fonts[(italic ? 2 : 0) + (bold ? 1 : 0)];

  if(metrics.drawing.font != font) {

    context.font = font;
    metrics.drawing.font = font;

  }

  setFill(metrics, fill);
  context.fillText(symbol, x + metrics.cellWidth / 2, y + metrics.cellHeight / 2);

}

function paintFrame(metrics, frame, timestamp) {

  // A frame is a row-major terminal grid. Colors are packed ARGB integers and
  // flags carry terminal styles such as italic, bold, underline and blinking.
  var context = metrics.context;
  var blinkVisible = Math.floor(timestamp / 400) % 2 == 0;

  context.clearRect(0, 0, metrics.cssWidth, metrics.cssHeight);

  if(!frame || frame.width <= 0 || frame.height <= 0) return;

  var cellCount = Math.min(frame.symbols.length, frame.width * frame.height);

  for(var index = 0; index < cellCount; index++) {

    var symbol = frame.symbols[index];

    var column = index % frame.width;
    var row = Math.floor(index / frame.width);
    var x = column * metrics.cellWidth;
    var y = row * metrics.cellHeight;
    var flags = frame.flags[index] || 0;
    var background = frame.bg[index] || 0;

    if(background) {

      setFill(metrics, color(background));
      context.fillRect(x, y, metrics.cellWidth, metrics.cellHeight);

    }

    if(symbol == ' ' || flags & 32 || (flags & 16 && !blinkVisible)) continue;

    var foreground = color(frame.fg[index]);

    drawGlyph(context, symbol, x, y, metrics, foreground, Boolean(flags & 1), Boolean(flags & 2));
    setFill(metrics, foreground);

    if(flags & 4) context.fillRect(x, y + metrics.cellHeight - 1, metrics.cellWidth, 1);
    if(flags & 64) context.fillRect(x, y + Math.floor(metrics.cellHeight / 2), metrics.cellWidth, 1);

  }

}

class LogoEffect {

  constructor(container, fallback, canvas, input) {

    this.container = container;
    this.fallback = fallback;
    this.canvas = canvas;
    this.input = input;
    this.session = null;
    this.metrics = null;
    this.frame = null;
    this.accumulator = 0;
    this.lastTimestamp = performance.now();
    this.animationFrame = 0;
    this.repeatTimer = 0;
    this.paused = false;
    this.tick = this.tick.bind(this);

  }

  captureFrame() {

    // Copy the current WASM frame into browser-owned values before the session
    // advances and reuses its internal buffers.
    this.frame = {
      symbols: Array.from(this.session.symbols()),
      fg: this.session.fg(),
      bg: this.session.bg(),
      flags: this.session.flags(),
      width: this.session.width(),
      height: this.session.height(),
    };

  }

  createSession() {

    this.session?.free();
    this.metrics = configureCanvas(this.canvas, this.fallback, this.input);
    this.session = new Session(
      `${LOGO_COLOR}${this.input}${ANSI_RESET}`,
      EFFECT,
      this.metrics.columns,
      this.metrics.rows,
      undefined,
      FRAME_RATE
    );

    if(this.session.step()) this.captureFrame();

    paintFrame(this.metrics, this.frame, performance.now());
    this.container.classList.add('is-ttfx-ready');
    this.container.classList.remove('is-ttfx-loading');

  }

  start() {

    this.createSession();
    this.lastTimestamp = performance.now();
    this.animationFrame = window.requestAnimationFrame(this.tick);

  }

  restart() {

    if(this.repeatTimer) window.clearTimeout(this.repeatTimer);
    if(this.animationFrame) window.cancelAnimationFrame(this.animationFrame);

    this.repeatTimer = 0;
    this.animationFrame = 0;
    this.accumulator = 0;
    this.createSession();
    this.lastTimestamp = performance.now();

    if(!this.paused) this.animationFrame = window.requestAnimationFrame(this.tick);

  }

  setPaused(paused) {

    this.paused = paused;

    if(paused) {

      if(this.animationFrame) window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
      return;

    }

    this.lastTimestamp = performance.now();
    if(!this.animationFrame) this.animationFrame = window.requestAnimationFrame(this.tick);

  }

  tick(timestamp) {

    this.animationFrame = 0;
    if(this.paused || !this.session) return;

    // requestAnimationFrame still paints at the display refresh rate. WASM
    // advances all due simulation frames as one batch, then materializes only
    // the newest frame for the single canvas paint below.
    var frameDuration = 1000 / (FRAME_RATE * PLAYBACK_RATE);

    this.accumulator += Math.min(timestamp - this.lastTimestamp, MAX_FRAME_DELTA);
    this.lastTimestamp = timestamp;

    var frameCount = Math.floor(this.accumulator / frameDuration);

    if(frameCount > 0) {

      this.accumulator -= frameCount * frameDuration;

      var advanced = this.session.advance(frameCount);

      if(advanced > 0) this.captureFrame();

      if(advanced < frameCount) {

        paintFrame(this.metrics, this.frame, timestamp);

        // setPaused(false) re-enters tick after the effect has finished, so a
        // second timer here would orphan the first one's id.
        if(!this.repeatTimer) this.repeatTimer = window.setTimeout(() => {

          this.repeatTimer = 0;
          this.restart();

        }, REPEAT_DELAY);

        return;

      }

    }

    paintFrame(this.metrics, this.frame, timestamp);
    this.animationFrame = window.requestAnimationFrame(this.tick);

  }

  free() {

    if(this.repeatTimer) window.clearTimeout(this.repeatTimer);
    if(this.animationFrame) window.cancelAnimationFrame(this.animationFrame);

    this.repeatTimer = 0;
    this.animationFrame = 0;
    this.session?.free();
    this.session = null;

  }

}

async function ready() {

  // This is a progressive enhancement: reduced-motion users and any startup
  // failure continue to see the original static <pre> logo.
  var container = document.querySelector('.pre--ttfx');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if(!container || reduceMotion) return;

  var fallback = container.querySelector('pre');
  var canvas = container.querySelector('.pre__ttfx-canvas');

  if(!fallback || !canvas) {

    container.classList.remove('is-ttfx-loading');
    return;

  }

  try {

    await Promise.all([
      document.fonts.ready,
      initTtfx(),
    ]);

    var effects = JSON.parse(effectCatalog());
    if(!effects.some(effect => effect.name == EFFECT)) throw new Error(`ttfx does not expose ${EFFECT}`);

    var logo = new LogoEffect(container, fallback, canvas, fallback.textContent);
    var resizeTimer;

    logo.start();

    window.addEventListener('resize', () => {

      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => logo.restart(), 160);

    });

    document.addEventListener('visibilitychange', () => logo.setPaused(document.hidden));

    window.addEventListener('pagehide', event => {

      if(!event.persisted) logo.free();

    });

    window.addEventListener('pageshow', event => {

      if(event.persisted) logo.setPaused(false);

    });

  } catch(error) {

    console.error('Unable to start the Omarchy logo effect.', error);
    container.classList.remove('is-ttfx-loading');
    container.classList.remove('is-ttfx-ready');

  }

}

export { ready };
