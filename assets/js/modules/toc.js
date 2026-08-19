function ready() {

  var toc = document.querySelector('.manual__toc');

  if(!toc) return;

  var nav = document.querySelector('.nav');
  var headings = [...document.querySelectorAll('.manual__article :is(h2, h3)')];

  var links = {};
  var current = null;
  var locked = null;

  toc.querySelectorAll('ol a').forEach(link => {

    var id = link.getAttribute('href').slice(1);

    links[id] = link;

    link.addEventListener('click', () => {

      activate(id);

      clearTimeout(locked);

      locked = setTimeout(release, 700);

    });

  });

  document.addEventListener('scrollend', release);

  var observer = new IntersectionObserver(entries => {

    if(locked) return;

    var entered = -1;
    var passed = headings.length;

    entries.forEach(entry => {

      var index = headings.indexOf(entry.target);

      if(entry.isIntersecting) {

        entered = Math.max(entered, index);

      } else if(entry.rootBounds && entry.boundingClientRect.top >= entry.rootBounds.bottom) {

        passed = Math.min(passed, index);

      }

    });

    if(entered >= 0) {

      activate(headings[entered].id);

    } else if(passed < headings.length) {

      activate(headings[Math.max(passed - 1, 0)].id);

    }

  }, { rootMargin: '-' + (nav ? nav.offsetHeight : 0) + 'px 0px -80% 0px' });

  headings.forEach(heading => observer.observe(heading));

  function activate(id) {

    if(current) current.removeAttribute('aria-current');

    current = links[id];

    if(current) current.setAttribute('aria-current', 'true');

  }

  function release() {

    clearTimeout(locked);

    locked = null;

  }

}

export { ready };
