import * as search from './modules/search.js';
import * as workstations from './modules/workstations.js';

document.addEventListener('DOMContentLoaded', () => {

  search.ready();

  workstations.ready();

});
