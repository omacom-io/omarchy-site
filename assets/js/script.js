import * as search from './modules/search.js';
import * as toc from './modules/toc.js';
import * as workstations from './modules/workstations.js';

document.addEventListener('DOMContentLoaded', () => {

  search.ready();

  toc.ready();

  workstations.ready();

});
