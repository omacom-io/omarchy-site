// Upgrade the homepage ASCII mark to a Web Text Effects canvas. The <pre>
// stays in the document for no-JS and reduced-motion. wte.csfh.dev has no
// npm package; /wte-canvas.js is the published web component (the
// /builds/latest/ path currently serves the player HTML).

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

function restoreAscii(canvas) {
  const root = canvas.closest('.pre');
  canvas.style.display = 'none';
  root?.classList.add('pre--static');
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

function sizeCanvas(canvas, pre) {
  const box = pre.getBoundingClientRect();
  const cell = Math.max(1, Math.floor(box.width / ART_COLUMNS));
  canvas.style.width = `${cell * ART_COLUMNS}px`;
  canvas.style.height = `${cell * ART_ROWS * CELL_ASPECT}px`;
}

function ready() {
  if (prefersReducedMotion()) return;
  if (window.location.pathname !== '/') return;

  const pre = document.querySelector('.pre a pre');
  if (!(pre instanceof HTMLPreElement)) return;

  const input = artFromPre(pre);
  if (input.trim() === '') return;

  afterFonts()
    .then(() => import(WTE_CANVAS_URL))
    .then(() => {
      const canvas = document.createElement('wte-canvas');
      sizeCanvas(canvas, pre);
      canvas.setAttribute('effect', EFFECT);
      canvas.setAttribute('input', input);
      canvas.setAttribute('aria-hidden', 'true');

      const onError = (event) => {
        const message = String(event.message ?? event.error ?? '');
        if (!/memory access out of bounds|RuntimeError/i.test(message)) return;
        window.removeEventListener('error', onError);
        restoreAscii(canvas);
      };
      window.addEventListener('error', onError);

      pre.after(canvas);
    })
    .catch(() => {
      // Leave the ASCII mark in place if the skin fails to load.
    });
}

export { ready };
