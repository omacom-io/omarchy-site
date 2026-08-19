function ready() {

  function escapeHTML(str) {

    return str.replace(/[&<>"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    })[char]);

  }

  function termsRegExp(searchTerm) {

    var terms = searchTerm.trim().split(/\s+/).filter(Boolean).map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    return terms.length ? new RegExp('(' + terms.join('|') + ')', 'gi') : null;

  }

  function snippet(content, regexp) {

    var length = 240;
    var match = regexp ? content.match(regexp) : null;
    var start = 0;

    if(match) start = Math.max(0, content.indexOf(match[0]) - 40);

    var clippedStart = start > 0;
    var clippedEnd = start + length < content.length;
    var excerpt = content.substring(start, start + length);

    if(clippedStart) excerpt = excerpt.replace(/^\S*\s+/, '');
    if(clippedEnd) excerpt = excerpt.replace(/\s+\S*$/, '');

    excerpt = escapeHTML(excerpt);

    if(regexp) excerpt = excerpt.replace(regexp, '<mark>$1</mark>');

    return (clippedStart ? '...' : '') + excerpt + (clippedEnd ? '...' : '');

  }

  function showResults(results, store, searchTerm) {

    document.querySelector('.search-query mark').textContent = searchTerm;

    var entries = document.querySelector('.search-results__entries');
    var regexp = termsRegExp(searchTerm);

    if(!results.length) {

      entries.innerHTML = '<div class="search-results__entry"><p>No results found.</p></div>';

      return;

    }

    entries.innerHTML = results.map(result => {

      var item = store[result.ref];
      var slug = item.url.replace(/^\/|\/$/g, '').replace(/\//g, ' / ');

      return `<div class="search-results__entry">
        <a href="${item.url}">
          <dl>
            <dt>${escapeHTML(item.title)}</dt>
            <dd>${escapeHTML(slug)}</dd>
          </dl>
        </a>
        <p>${snippet(item.content, regexp)}</p>
      </div>`;

    }).join('');

  }

  var searchTerm = new URLSearchParams(window.location.search).get('q');

  if(searchTerm) {

    document.querySelectorAll('.search-box').forEach(box => box.value = searchTerm);

    var idx = lunr(function() {

      this.field('title', {
        boost: 10
      });
      this.field('content');

      for(var key in window.store) {
        this.add({
          'id': key,
          'title': window.store[key].title,
          'content': window.store[key].content
        });
      }

    });

    var results = idx.search(searchTerm);

    showResults(results, window.store, searchTerm);

  }

  document.querySelectorAll('.search').forEach(form => {

    var searchInput = form.querySelector('input');

    form.addEventListener('submit', e => {

      e.preventDefault();

      var searchValue = searchInput.value.trim();

      if(searchValue) {

        searchInput.value = searchValue;

        form.submit();

      }

    });

  });

}

export { ready };
