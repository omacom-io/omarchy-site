// Cycle the 20 bundled themes (t / Shift+T / the chip). An inline head
// script restores the stored choice before first paint, wte-home style.

import * as logo from './logo.js';

const THEMES = [
  'tokyo-night',
  'catppuccin',
  'catppuccin-latte',
  'ethereal',
  'everforest',
  'flexoki-light',
  'gruvbox',
  'hackerman',
  'kanagawa',
  'last-horizon',
  'lumon',
  'lupine',
  'matte-black',
  'miasma',
  'nord',
  'osaka-jade',
  'retro-82',
  'ristretto',
  'rose-pine',
  'solitude',
];

const DEFAULT_THEME = THEMES[0];
const STORAGE_KEY = 'omarchy-theme';

function current() {
  const name = document.documentElement.getAttribute('data-theme');
  return THEMES.includes(name) ? name : DEFAULT_THEME;
}

let markRestarted = false;

function apply(name) {
  const pre = document.querySelector('.pre');
  if (name === DEFAULT_THEME) {
    document.documentElement.removeAttribute('data-theme');
    // Back on Tokyo Night the laseretch mark returns: unhide the finished
    // canvas, or play the animation if the page loaded themed.
    if (pre?.classList.contains('pre--static')) {
      if (pre.classList.contains('pre--live')) {
        pre.classList.remove('pre--static');
      } else if (!markRestarted && document.documentElement.classList.contains('wte-home')) {
        markRestarted = true;
        pre.classList.remove('pre--static');
        logo.ready();
      }
    }
  } else {
    document.documentElement.setAttribute('data-theme', name);
    // Laseretch's colors are baked in, so show the static mark instead.
    pre?.classList.add('pre--static');
  }

  const label = document.querySelector('.theme-switcher__name');
  if (label != null) label.textContent = name;

  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // Storage can be unavailable; switching still works for this page.
  }
}

function step(delta) {
  const index = THEMES.indexOf(current());
  apply(THEMES[(index + delta + THEMES.length) % THEMES.length]);
}

function isTyping(target) {
  return target instanceof HTMLElement &&
    (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName));
}

function ready() {
  // Normalize whatever the pre-paint restore put on <html>.
  apply(current());

  document.querySelector('.theme-switcher')?.addEventListener('click', () => {
    step(1);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() !== 't') return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (isTyping(event.target)) return;
    step(event.shiftKey ? -1 : 1);
  });
}

export { ready };
