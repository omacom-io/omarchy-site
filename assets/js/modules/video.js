// Videos start as a poster and a play button. Nothing is requested from
// YouTube until someone clicks, which keeps the third-party embed (and its
// cookies and scripts) off the initial page load entirely.

const PARAMS = 'autoplay=1&rel=0';

function embed(facade) {
  const id = facade.dataset.video;
  if (id == null || id === '') return;

  const iframe = document.createElement('iframe');
  iframe.title = facade.dataset.title ?? 'Video';
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${PARAMS}`;
  iframe.allow =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.allowFullscreen = true;

  facade.replaceWith(iframe);
  iframe.focus();
}

function ready() {
  for (const facade of document.querySelectorAll('.video__facade')) {
    facade.addEventListener('click', () => embed(facade), { once: true });
  }
}

export { ready };
