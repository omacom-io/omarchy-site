// Upgrade the homepage ASCII mark to a Web Text Effects canvas. The <pre>
// stays in the document as the layout size and as the fallback. index.html
// adds .wte-home before first paint so the green mark stays hidden while
// the skin loads. wte.csfh.dev has no npm package; /wte-canvas.js is the
// published web component (the /builds/latest/ path currently serves the
// player HTML).

const WTE_CANVAS_URL = 'https://wte.csfh.dev/wte-canvas.js';
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
    .then(() => import(WTE_CANVAS_URL))
    .then(() => {
      const box = pre.getBoundingClientRect();
      if (box.width < 8 || box.height < 8) {
        markStatic();
        return;
      }

      const holder = document.createElement('span');
      holder.className = 'pre__wte';

      const canvas = document.createElement('wte-canvas');
      canvas.setAttribute('effect', EFFECT);
      canvas.setAttribute('input', input);
      canvas.setAttribute('aria-hidden', 'true');

      const onError = (event) => {
        const message = String(event.message ?? event.error ?? '');
        if (!/memory access out of bounds|RuntimeError/i.test(message)) return;
        window.removeEventListener('error', onError);
        markStatic();
      };
      window.addEventListener('error', onError);

      fitCanvas(canvas, pre);
      holder.append(canvas);
      link.append(holder);
    })
    .catch(() => {
      markStatic();
    });
}

export { ready };
