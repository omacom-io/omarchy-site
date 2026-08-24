// Client-side search over the manual. The index is built by Astro, at
// src/pages/manual/search-index.json.ts — one entry per heading — and fetched
// the first time someone reaches for the box.

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

      // Hold the focus so the blur doesn't close the results before the click lands.
      // The link still navigates itself, so middle and modifier clicks keep working.
      if(e.target.closest('.search__result')) e.preventDefault();

    });

    search.addEventListener('focusout', (e) => {

      if(!search.contains(e.relatedTarget)) close();

    });

    document.addEventListener('keydown', (e) => {

      // A chapter hides the box at narrow widths, where there's nothing to focus
      if(shortcut(e) && input.offsetParent) {

        e.preventDefault();

        input.focus();
        input.select();

      }

    });

    function run(value) {

      query = value.trim();

      if(!query) return close();

      if(!entries) return load().then(resume);

      matches = lookup(entries, query).slice(0, MAX_RESULTS);
      active = -1;

      render();

    }

    // The index finished loading — or failed to — while the query was being typed
    function resume() {

      if(query != input.value.trim()) return;

      entries ? run(input.value) : unavailable();

    }

    function render() {

      results.innerHTML = matches.length
        ? matches.map((match, index) => result(match, index)).join('')
        : `<p class="search__empty">No results for &ldquo;${escape(query)}&rdquo;</p>`;

      open();

    }

    function unavailable() {

      matches = [];
      active = -1;

      results.innerHTML = '<p class="search__empty">Search is unavailable right now</p>';

      open();

    }

    function result(match, index) {

      var entry = match.entry;
      var chapter = entry.title == entry.chapter ? '' :
        `<span class="search__result-chapter">${escape(entry.chapter)}</span>`;

      return `
        <a class="search__result" href="${escape(entry.url)}" role="option" id="search-result-${index}" aria-selected="false" tabindex="-1">
          <span class="search__result-heading">
            <span class="search__result-title">${highlight(entry.title, match.pattern)}</span>
            ${chapter}
          </span>
          <span class="search__result-preview">${preview(entry.text, match.pattern)}</span>
        </a>
      `;

    }

    function navigate(e) {

      if(e.key == 'ArrowDown' || e.key == 'ArrowUp') {

        e.preventDefault();

        if(results.hidden) run(input.value);
        else select(active + (e.key == 'ArrowDown' ? 1 : -1));

      } else if(e.key == 'Enter' && !results.hidden) {

        var chosen = active >= 0 ? matches[active] : matches[0];

        if(chosen) {

          e.preventDefault();
          window.location = chosen.entry.url;

        }

      } else if(e.key == 'Tab') {

        // The results are a scroller, which Chrome will otherwise tab into
        close();

      } else if(e.key == 'Escape') {

        // A search input clears itself on Escape, which would take the query along
        // with the results — the second press does the clearing here instead
        e.preventDefault();

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
      matches = [];
      active = -1;

      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');

    }

  }

}

function shortcut(e) {

  if(e.metaKey || e.ctrlKey || e.altKey) return false;
  if(e.target.closest('input, textarea, select, [contenteditable]')) return false;

  return e.key == '/';

}

// A load that fails isn't kept, so the next keystroke or focus tries again
function load() {

  loading ||= fetch(INDEX_URL)
    .then(response => response.ok ? response.json() : Promise.reject(response.status))
    .then(index => { entries = index; })
    .catch(() => { loading = null; });

  return loading;

}


/* Matching */

function lookup(entries, query) {

  var pattern = compile(query);

  if(!pattern) return [];

  return entries
    .map(entry => ({ entry: entry, pattern: pattern, score: score(entry, pattern) }))
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.url.localeCompare(b.entry.url));

}

// The same handful of expressions runs against every entry in the index, so a query
// is compiled once here rather than once per entry.
function compile(query) {

  var sources = tokenize(query).map(quote);

  if(!sources.length) return null;

  return {
    terms: sources.map(source => ({
      anywhere: matcher(source, 'giu'),
      whole: matcher(`${source}(?![\\p{L}\\p{N}])`, 'iu')
    })),
    phrase: query.toLowerCase(),
    first: matcher(`(?:${sources.join('|')})`, 'iu'),
    words: matcher(`(${sources.map(source => `${source}[\\p{L}\\p{N}]*`).join('|')})`, 'giu')
  };

}

function tokenize(query) {

  return query.toLowerCase().split(/[^\p{L}\p{N}+#_-]+/u).filter(Boolean);

}

// Every term has to appear in the section itself — a term that only shows up in the
// chapter title would otherwise drag in every other section of that chapter. Headings
// count for much more than body text, and the terms found as a run count for more
// than the same terms scattered across the section.
function score(entry, pattern) {

  var total = 0;

  for(const term of pattern.terms) {

    var inTitle = occurrences(entry.title, term.anywhere);
    var inText = occurrences(entry.text, term.anywhere);

    if(!inTitle && !inText) return 0;

    total += inTitle * 30 + Math.min(inText, 5) * 2 + occurrences(entry.chapter, term.anywhere) * 10;

    if(term.whole.test(entry.title)) total += 20;

  }

  if(pattern.terms.length > 1 && phrased(entry, pattern.phrase)) total += 40;

  return total;

}

function occurrences(text, term) {

  return (text.match(term) || []).length;

}

// Only entries that already matched every term get this far, so the text they are
// joined from is built here rather than carried on every entry in the index
function phrased(entry, phrase) {

  return `${entry.title} ${entry.chapter} ${entry.text}`.toLowerCase().includes(phrase);

}

// Terms match at the start of a word, so "nav" finds "navigation" but not "trackpad"
function matcher(source, flags) {

  return new RegExp(`(?<![\\p{L}\\p{N}])${source}`, flags);

}

// Hyphens in the text are optional, so "wifi" finds "Wi-Fi" and "dualboot" finds "dual-boot"
function quote(term) {

  return [...term].map(character => character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('-?');

}


/* Rendering */

// Centred on the first term to appear, so the preview shows why the section matched
function preview(text, pattern) {

  var at = text.search(pattern.first);
  var start = Math.max(0, at - PREVIEW_LENGTH / 3);
  var snippet = text.slice(start, start + PREVIEW_LENGTH);

  if(start > 0) snippet = `…${snippet.replace(/^\S*\s/, '')}`;
  if(start + PREVIEW_LENGTH < text.length) snippet = `${snippet.replace(/\s\S*$/, '')}…`;

  return highlight(snippet, pattern);

}

// Splitting on a capturing pattern lands the matches on the odd indexes, so the
// surrounding text can be escaped and the matches wrapped in one pass.
function highlight(text, pattern) {

  return text
    .split(pattern.words)
    .map((part, index) => index % 2 ? `<mark>${escape(part)}</mark>` : escape(part))
    .join('');

}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

function escape(text) {

  return text.replace(/[&<>"]/g, character => ESCAPES[character]);

}

export { ready };
