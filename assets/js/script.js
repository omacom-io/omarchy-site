import * as workstations from './modules/workstations.js';
import * as wteLogo from './modules/wte-logo.js';

document.addEventListener('DOMContentLoaded', () => {

  workstations.ready();
  wteLogo.ready();

});
