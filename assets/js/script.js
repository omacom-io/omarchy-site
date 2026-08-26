import * as workstations from './modules/workstations.js';

document.addEventListener('DOMContentLoaded', () => {

  workstations.ready();

  if(document.querySelector('.pre--ttfx')) {

    import('./modules/ttfx-logo.js')
      .then(module => module.ready())
      .catch(error => console.error('Unable to load the Omarchy logo effect.', error));

  }

});
