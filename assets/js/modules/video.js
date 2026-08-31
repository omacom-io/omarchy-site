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

// A facade with data-video is upgraded to an inline player; without it, the
// poster is just a link to YouTube and the click passes straight through.
function ready() {
  for (const facade of document.querySelectorAll('.video__facade[data-video]')) {
    facade.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        embed(facade);
      },
      { once: true },
    );
  }
}

export { ready };
