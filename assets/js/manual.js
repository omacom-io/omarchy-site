import * as search from './modules/search.js';
import * as navigation from './modules/manual-navigation.js';

document.addEventListener('DOMContentLoaded', () => {

  search.ready();
  navigation.ready();

});
