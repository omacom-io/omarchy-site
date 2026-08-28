// Play the homepage ASCII mark once with Web Text Effects laseretch.
// <wte-canvas> always loops. Playback's onFinished control holds the last
// frame instead. The <pre> stays as the layout size and as the fallback.
// index.html adds .wte-home before first paint so the green mark stays
// hidden while the skin loads.

const WTE_CANVAS_URL = 'https://wte.csfh.dev/builds/latest/wte-canvas.js';
const WTE_WASM_URL = 'https://wte.csfh.dev/ttfx/0.3.2/ttfx.wasm';
const EFFECT = 'laseretch';
const ART_COLUMNS = 81;
const ART_ROWS = 10;
const CELL_ASPECT = 2;
const FONT_WAIT_MS = 1000;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function artFromPre(pre) {
  let text = pre.textContent ?? '';
  if (text.startsWith('\n')) text = text.slice(1);
  return text.replace(/\n+$/, '');
}

function markStatic() {
  document.querySelector('.pre')?.classList.add('pre--static');
}

function afterFonts() {
  if (document.fonts?.ready == null) {
    return Promise.resolve();
  }
  return Promise.race([
    document.fonts.ready,
    new Promise((resolve) => {
      window.setTimeout(resolve, FONT_WAIT_MS);
    }),
  ]);
}

function fitCanvas(canvas, host) {
  const box = host.getBoundingClientRect();
  const cell = Math.max(
    1,
    Math.floor(Math.min(box.width / ART_COLUMNS, box.height / (ART_ROWS * CELL_ASPECT))),
  );
  const nativeWidth = cell * ART_COLUMNS;
  const nativeHeight = cell * ART_ROWS * CELL_ASPECT;
  canvas.style.width = `${nativeWidth}px`;
  canvas.style.height = `${nativeHeight}px`;
  canvas.style.transform = `scale(${box.width / nativeWidth}, ${box.height / nativeHeight})`;
}

async function loadCanvasPlayback() {
  const response = await fetch(WTE_CANVAS_URL);
  if (!response.ok) {
    throw new Error(`wte-canvas ${response.status}`);
  }
  const source = await response.text();
  const spec = source.match(/from["'](\.\/assets\/playback-[A-Za-z0-9_-]+\.js)["']/);
  if (spec == null) {
    throw new Error('wte playback module not found');
  }
  const mod = await import(new URL(spec[1], response.url).href);
  for (const value of Object.values(mod)) {
    if (
      typeof value === 'function' &&
      value.prototype != null &&
      typeof value.prototype.restart === 'function' &&
      typeof value.prototype.stop === 'function'
    ) {
      return value;
    }
  }
  throw new Error('CanvasPlayback not found');
}

function ready() {
  if (prefersReducedMotion()) return;
  if (window.location.pathname !== '/') return;

  const pre = document.querySelector('.pre a pre');
  const link = pre?.parentElement;
  if (!(pre instanceof HTMLPreElement) || link == null) return;

  const input = artFromPre(pre);
  if (input.trim() === '') {
    markStatic();
    return;
  }

  afterFonts()
    .then(() => loadCanvasPlayback())
    .then((CanvasPlayback) => {
      const box = pre.getBoundingClientRect();
      if (box.width < 8 || box.height < 8) {
        markStatic();
        return;
      }

      const holder = document.createElement('span');
      holder.className = 'pre__wte';

      const canvas = document.createElement('canvas');
      canvas.setAttribute('aria-hidden', 'true');
      fitCanvas(canvas, pre);

      const playback = new CanvasPlayback({
        canvas,
        width: () => canvas.clientWidth,
        height: () => canvas.clientHeight,
        connected: () => canvas.isConnected,
        input: () => input,
        effect: () => EFFECT,
        wasmUrl: () => WTE_WASM_URL,
        onFinished: () => {
          canvas.dataset.wteFinished = '1';
        },
      });

      const onError = (event) => {
        const message = String(event.message ?? event.error ?? '');
        if (!/memory access out of bounds|RuntimeError/i.test(message)) return;
        window.removeEventListener('error', onError);
        playback.stop();
        markStatic();
      };
      window.addEventListener('error', onError);

      holder.append(canvas);
      link.append(holder);
      void playback.restart();
    })
    .catch(() => {
      markStatic();
    });
}

export { ready };
