import * as workstations from './modules/workstations.js';
import * as topbar from './modules/topbar.js';

document.addEventListener('DOMContentLoaded', () => {

  workstations.ready();
  topbar.ready();

});
