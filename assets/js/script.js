import * as copy from './modules/copy.js';
import * as search from './modules/search.js';
import * as toc from './modules/toc.js';
import * as workstations from './modules/workstations.js';

document.addEventListener('DOMContentLoaded', () => {

  copy.ready();

  search.ready();

  toc.ready();

  workstations.ready();

});
