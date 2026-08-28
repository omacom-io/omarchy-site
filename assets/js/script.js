import * as workstations from './modules/workstations.js';

var ttfxContainer = document.querySelector('.pre--ttfx');
var reduceTtfxMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var animateTtfx = Boolean(ttfxContainer) && !reduceTtfxMotion;

// An inline <head> script hides the fallback before the first paint and arms
// the timeout that reveals it again. Drop the class early when the canvas
// cannot take over; cancel the timeout once it has.
function revealTtfxFallback() {

  document.documentElement.classList.remove('js-ttfx');

}

document.addEventListener('DOMContentLoaded', () => {

  workstations.ready();

  if(animateTtfx) {

    import('./modules/ttfx-logo.js')
      .then(module => module.ready())
      .then(() => window.clearTimeout(window.ttfxRevealTimer))
      .catch(error => {

        revealTtfxFallback();
        console.error('Unable to load the Omarchy logo effect.', error);

      });

  }

});
