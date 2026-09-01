// Play the homepage ASCII mark once with Web Text Effects laseretch.
// <wte-canvas> always loops. Playback's onFinished control holds the last
// frame instead. The <pre> stays as the layout size and as the fallback.
// index.html adds .wte-home before first paint so the green mark stays
// hidden while the skin loads. Runtime files live in /assets/js/wte/.

const WTE_CANVAS_URL = '/assets/js/wte/wte-canvas.js';
const WTE_WASM_URL = '/assets/js/wte/laseretch.wasm';
const EFFECT = 'laseretch';
const ART_COLUMNS = 81;
const ART_ROWS = 10;
const CELL_ASPECT = 2;
const FONT_WAIT_MS = 1000;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let wasmBytes = null;

async function loadWasm() {
  const response = await fetch(WTE_WASM_URL);
  if (!response.ok) {
    throw new Error(`laseretch wasm ${response.status}`);
  }
  wasmBytes = await response.arrayBuffer();
}

function wasmUrl() {
  if (wasmBytes == null) {
    throw new Error('laseretch wasm is not loaded');
  }
  return wasmBytes;
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

function nativeGrid(host) {
  const box = host.getBoundingClientRect();
  const cell = Math.max(
    1,
    Math.floor(Math.min(box.width / ART_COLUMNS, box.height / (ART_ROWS * CELL_ASPECT))),
  );
  return { width: cell * ART_COLUMNS, height: cell * ART_ROWS * CELL_ASPECT };
}

function scaleCanvas(canvas, host, nativeWidth, nativeHeight) {
  const box = host.getBoundingClientRect();
  if (box.width < 1 || box.height < 1) return;
  canvas.style.transform = `scale(${box.width / nativeWidth}, ${box.height / nativeHeight})`;
}

function watchSize(target, onChange) {
  let frame = 0;
  const schedule = () => {
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      onChange();
    });
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(target);
  return () => {
    if (frame !== 0) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    observer.disconnect();
  };
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
  if (!document.documentElement.classList.contains('wte-home')) return;

  const pre = document.querySelector('.quattro-logo pre, .pre a pre');
  const host = pre?.parentElement;
  if (!(pre instanceof HTMLPreElement) || host == null) return;

  const input = artFromPre(pre);
  if (input.trim() === '') {
    markStatic();
    return;
  }

  afterFonts()
    .then(loadWasm)
    .then(loadCanvasPlayback)
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
      const native = nativeGrid(pre);
      canvas.style.width = `${native.width}px`;
      canvas.style.height = `${native.height}px`;
      scaleCanvas(canvas, pre, native.width, native.height);

      const playback = new CanvasPlayback({
        canvas,
        width: () => native.width,
        height: () => native.height,
        connected: () => canvas.isConnected,
        input: () => input,
        effect: () => EFFECT,
        wasmUrl,
        onFinished() {},
        frameRate: () => 240,
      });

      const stopWatching = watchSize(pre, () => {
        scaleCanvas(canvas, pre, native.width, native.height);
      });

      const fail = () => {
        window.removeEventListener('error', onError);
        stopWatching();
        playback.stop();
        document.querySelector('.pre')?.classList.remove('pre--live');
        markStatic();
      };

      const onError = (event) => {
        const message = String(event.message ?? event.error ?? '');
        if (!/memory access out of bounds|RuntimeError|CompileError|WebAssembly/i.test(message)) {
          return;
        }
        fail();
      };
      window.addEventListener('error', onError);

      holder.append(canvas);
      host.append(holder);
      // Cancel the CSS fallback reveal now that a canvas is actually up.
      document.querySelector('.pre')?.classList.add('pre--live');
      void playback.restart().catch(fail);
    })
    .catch(() => {
      markStatic();
    });
}

export { ready };
