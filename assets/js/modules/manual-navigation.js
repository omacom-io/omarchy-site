function ready() {

  var pages = {
    ArrowLeft: document.querySelector('a[rel="prev"]'),
    ArrowRight: document.querySelector('a[rel="next"]')
  };

  document.addEventListener('keydown', (e) => {

    if(e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    if(e.target != document.body) return;

    var page = pages[e.key];

    if(page) {

      e.preventDefault();
      window.location = page.href;

    }

  });

}

export { ready };
