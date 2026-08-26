import initTtfx, { Session, effectCatalog } from '../vendor/ttfx/ttfx-wasm.js';

const EFFECT = 'laseretch';
const EFFECT_PADDING_ROWS = 4;
const FRAME_RATE = 120;
const REPEAT_DELAY = 5000;
const LOGO_COLOR = '\u001b[38;2;158;206;106m';
const ANSI_RESET = '\u001b[0m';

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

  var style = window.getComputedStyle(fallback);

  return {
    context: context,
    cssWidth: cssWidth,
    cssHeight: cssHeight,
    cellWidth: cellWidth,
    cellHeight: cellHeight,
    fontFamily: style.fontFamily,
    fontSize: parseFloat(style.fontSize),
    columns: source.columns,
    rows: rows,
  };

}

function color(value) {

  return value ? `#${(value & 0xffffff).toString(16).padStart(6, '0')}` : '#c8c8c8';

}

function drawGlyph(context, symbol, x, y, metrics, fill, italic, bold) {

  var blocks = blockGlyphs[symbol];

  if(blocks) {

    context.fillStyle = fill;

    blocks.forEach(([left, top, width, height]) => {

      context.fillRect(
        x + left * metrics.cellWidth,
        y + top * metrics.cellHeight,
        Math.max(1, width * metrics.cellWidth),
        Math.max(1, height * metrics.cellHeight)
      );

    });

    return;

  }

  context.save();
  context.beginPath();
  context.rect(x, y, metrics.cellWidth, metrics.cellHeight);
  context.clip();
  context.font = `${italic ? 'italic ' : ''}${bold ? '700' : '400'} ${metrics.fontSize}px ${metrics.fontFamily}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = fill;
  context.fillText(symbol, x + metrics.cellWidth / 2, y + metrics.cellHeight / 2);
  context.restore();

}

function paintFrame(metrics, frame, timestamp) {

  var context = metrics.context;
  var blinkVisible = Math.floor(timestamp / 400) % 2 == 0;

  context.clearRect(0, 0, metrics.cssWidth, metrics.cssHeight);

  if(!frame || frame.width <= 0 || frame.height <= 0) return;

  frame.symbols.forEach((symbol, index) => {

    if(index >= frame.width * frame.height) return;

    var column = index % frame.width;
    var row = Math.floor(index / frame.width);
    var x = column * metrics.cellWidth;
    var y = row * metrics.cellHeight;
    var flags = frame.flags[index] || 0;
    var background = frame.bg[index] || 0;

    if(background) {

      context.fillStyle = color(background);
      context.fillRect(x, y, metrics.cellWidth, metrics.cellHeight);

    }

    if(symbol == ' ' || flags & 32 || (flags & 16 && !blinkVisible)) return;

    var foreground = color(frame.fg[index]);

    drawGlyph(context, symbol, x, y, metrics, foreground, Boolean(flags & 1), Boolean(flags & 2));
    context.fillStyle = foreground;

    if(flags & 4) context.fillRect(x, y + metrics.cellHeight - 1, metrics.cellWidth, 1);
    if(flags & 64) context.fillRect(x, y + Math.floor(metrics.cellHeight / 2), metrics.cellWidth, 1);

  });

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

    this.container.classList.add('is-ttfx-ready');
    paintFrame(this.metrics, this.frame, performance.now());

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

    var frameDuration = 1000 / FRAME_RATE;

    this.accumulator += Math.min(timestamp - this.lastTimestamp, 100);
    this.lastTimestamp = timestamp;

    while(this.accumulator >= frameDuration) {

      this.accumulator -= frameDuration;

      if(this.session.step()) {

        this.captureFrame();

      } else {

        paintFrame(this.metrics, this.frame, timestamp);
        this.repeatTimer = window.setTimeout(() => {

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

  var container = document.querySelector('.pre--ttfx');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if(!container || reduceMotion) return;

  var fallback = container.querySelector('pre');
  var canvas = container.querySelector('.pre__ttfx-canvas');

  if(!fallback || !canvas) return;

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
    container.classList.remove('is-ttfx-ready');

  }

}

export { ready };
