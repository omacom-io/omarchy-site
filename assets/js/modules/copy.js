function ready() {

  document.querySelectorAll('[data-markdown]').forEach(markdown => {

    markdown.addEventListener('click', () => {

      var text = fetch(markdown.dataset.markdown).then(response => response.text());
      var blob = text.then(value => new Blob([value], { type: 'text/plain' }));

      var written = window.ClipboardItem
        ? navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })])
        : text.then(value => navigator.clipboard.writeText(value));

      written.then(() => flash(markdown));

    });

  });

  function flash(button) {

    clearTimeout(button.copied);

    button.setAttribute('data-copied', '');
    button.copied = setTimeout(() => button.removeAttribute('data-copied'), 1500);

  }

}

export { ready };
