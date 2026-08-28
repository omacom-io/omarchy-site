import * as workstations from './modules/workstations.js';

var ttfxContainer = document.querySelector('.pre--ttfx');
var reduceTtfxMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Keep the static fallback available if JavaScript fails, but hide it as soon
// as we know the animated logo can be attempted. Otherwise the complete green
// logo flashes briefly before laseretch starts from an empty frame.
if(ttfxContainer && !reduceTtfxMotion) ttfxContainer.classList.add('is-ttfx-loading');

document.addEventListener('DOMContentLoaded', () => {

  workstations.ready();

  if(ttfxContainer && !reduceTtfxMotion) {

    import('./modules/ttfx-logo.js')
      .then(module => module.ready())
      .catch(error => {

        ttfxContainer.classList.remove('is-ttfx-loading');
        console.error('Unable to load the Omarchy logo effect.', error);

      });

  }

});
