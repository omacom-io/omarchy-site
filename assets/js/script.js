import * as workstations from './modules/workstations.js';
import * as logo from './modules/logo.js';
import * as video from './modules/video.js';

document.addEventListener('DOMContentLoaded', () => {

  workstations.ready();
  logo.ready();
  video.ready();

});
