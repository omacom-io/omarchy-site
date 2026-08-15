// Client-side search over the manual. The index is built by bin/build-manual —
// one entry per heading — and fetched the first time someone reaches for the box.

const INDEX_URL = '/manual/search-index.json';
const MAX_RESULTS = 8;
const PREVIEW_LENGTH = 160;

let entries = null;
let loading = null;

function ready() {

  var search = document.querySelector('.search');

  if(search) {

    var input = search.querySelector('.search__input');
    var results = search.querySelector('.search__results');

    var query = '';
    var matches = [];
    var active = -1;

    search.hidden = false;

    input.addEventListener('focus', () => { load(); });
    input.addEventListener('input', () => { run(input.value); });
    input.addEventListener('keydown', (e) => { navigate(e); });

    results.addEventListener('mousedown', (e) => {

      // Beat the blur that would otherwise close the results before the click lands
      var result = e.target.closest('.search__result');

      if(result) {

        e.preventDefault();
        window.location = result.href;

      }

    });

    search.addEventListener('focusout', (e) => {

      if(!search.contains(e.relatedTarget)) close();

    });

    document.addEventListener('keydown', (e) => {

      if(shortcut(e)) {

        e.preventDefault();

        input.focus();
        input.select();

      }

    });

    function run(value) {

      query = value.trim();

      if(!query) return close();

      if(!entries) return load().then(() => { if(query == input.value.trim()) run(input.value); });

      matches = lookup(entries, query).slice(0, MAX_RESULTS);
      active = -1;

      render();

    }

    function render() {

      results.innerHTML = matches.length
        ? matches.map((match, index) => result(match, index)).join('')
        : `<p class="search__empty">No results for &ldquo;${escape(query)}&rdquo;</p>`;

      open();

    }

    function result(match, index) {

      var entry = match.entry;
      var chapter = entry.title == entry.chapter ? '' :
        `<span class="search__result-chapter">${escape(entry.chapter)}</span>`;

      return `
        <a class="search__result" href="${entry.url}" role="option" id="search-result-${index}" aria-selected="false" tabindex="-1">
          <span class="search__result-heading">
            <span class="search__result-title">${highlight(entry.title, match.terms)}</span>
            ${chapter}
          </span>
          <span class="search__result-preview">${preview(entry.text, match.terms)}</span>
        </a>
      `;

    }

    function navigate(e) {

      if(e.key == 'ArrowDown' || (e.key == 'Tab' && !e.shiftKey && results.hidden == false)) {

        e.preventDefault();
        select(active + 1);

      } else if(e.key == 'ArrowUp' || (e.key == 'Tab' && e.shiftKey && results.hidden == false)) {

        e.preventDefault();
        select(active - 1);

      } else if(e.key == 'Enter') {

        var chosen = active >= 0 ? matches[active] : matches[0];

        if(chosen) {

          e.preventDefault();
          window.location = chosen.entry.url;

        }

      } else if(e.key == 'Escape') {

        if(results.hidden) {

          input.value = '';
          input.blur();

        } else {

          close();

        }

      }

    }

    function select(index) {

      var options = results.querySelectorAll('.search__result');

      if(!options.length) return;

      if(index < 0) index = options.length - 1;
      if(index >= options.length) index = 0;

      options.forEach(option => {

        option.classList.remove('search__result--active');
        option.setAttribute('aria-selected', 'false');

      });

      active = index;

      options[active].classList.add('search__result--active');
      options[active].setAttribute('aria-selected', 'true');
      options[active].scrollIntoView({ block: 'nearest' });

      input.setAttribute('aria-activedescendant', options[active].id);

    }

    function open() {

      results.hidden = false;

      input.setAttribute('aria-expanded', 'true');
      input.removeAttribute('aria-activedescendant');

    }

    function close() {

      results.hidden = true;
      active = -1;

      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');

    }

  }

}

function shortcut(e) {

  if(e.metaKey || e.ctrlKey) return e.key == 'k';
  if(e.altKey || e.target.closest('input, textarea, select, [contenteditable]')) return false;

  return e.key == '/';

}

function load() {

  loading ||= fetch(INDEX_URL)
    .then(response => response.json())
    .then(index => { entries = index.map(prepare); })
    .catch(() => { entries = []; });

  return loading;

}

function prepare(entry) {

  return Object.assign({}, entry, {
    haystack: `${entry.title} ${entry.chapter} ${entry.text}`.toLowerCase()
  });

}


/* Matching */

function lookup(entries, query) {

  var terms = tokenize(query);

  if(!terms.length) return [];

  var phrase = query.toLowerCase();

  return entries
    .map(entry => ({ entry: entry, terms: terms, score: score(entry, terms, phrase) }))
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.url.localeCompare(b.entry.url));

}

function tokenize(query) {

  return query.toLowerCase().split(/[^\p{L}\p{N}+#_-]+/u).filter(Boolean);

}

// Every term has to appear in the section itself — a term that only shows up in the
// chapter title would otherwise drag in every other section of that chapter. Headings
// count for much more than body text, and the terms found as a run count for more
// than the same terms scattered across the section.
function score(entry, terms, phrase) {

  var total = 0;

  for(const term of terms) {

    var inTitle = occurrences(entry.title, term);
    var inText = occurrences(entry.text, term);

    if(!inTitle && !inText) return 0;

    total += inTitle * 30 + Math.min(inText, 5) * 2 + occurrences(entry.chapter, term) * 10;

    if(exact(entry.title, term)) total += 20;

  }

  if(terms.length > 1 && entry.haystack.includes(phrase)) total += 40;

  return total;

}

function occurrences(text, term) {

  return (text.match(matcher(quote(term), 'giu')) || []).length;

}

function exact(text, term) {

  return matcher(`${quote(term)}(?![\\p{L}\\p{N}])`, 'iu').test(text);

}

// Terms match at the start of a word, so "nav" finds "navigation" but not "trackpad"
function matcher(term, flags) {

  return new RegExp(`(?<![\\p{L}\\p{N}])${term}`, flags);

}

// Hyphens in the text are optional, so "wifi" finds "Wi-Fi" and "dualboot" finds "dual-boot"
function quote(term) {

  return [...term].map(character => character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('-?');

}


/* Rendering */

function preview(text, terms) {

  var at = terms.reduce((earliest, term) => {

    var found = text.search(matcher(quote(term), 'iu'));

    return found >= 0 && (earliest < 0 || found < earliest) ? found : earliest;

  }, -1);

  var start = Math.max(0, at - PREVIEW_LENGTH / 3);
  var snippet = text.slice(start, start + PREVIEW_LENGTH);

  if(start > 0) snippet = `…${snippet.replace(/^\S*\s/, '')}`;
  if(start + PREVIEW_LENGTH < text.length) snippet = `${snippet.replace(/\s\S*$/, '')}…`;

  return highlight(snippet, terms);

}

// Splitting on a capturing pattern lands the matches on the odd indexes, so the
// surrounding text can be escaped and the matches wrapped in one pass.
function highlight(text, terms) {

  var pattern = terms.map(term => `${quote(term)}[\\p{L}\\p{N}]*`).join('|');

  return text
    .split(matcher(`(${pattern})`, 'giu'))
    .map((part, index) => index % 2 ? `<mark>${escape(part)}</mark>` : escape(part))
    .join('');

}

function escape(text) {

  var element = document.createElement('span');

  element.textContent = text;

  return element.innerHTML;

}

export { ready };
