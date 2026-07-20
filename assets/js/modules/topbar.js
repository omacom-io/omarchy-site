function ready() {

  var topbar = document.querySelector('.topbar');

  if(topbar) {

    var clock = topbar.querySelector('.topbar__clock');

    if(clock) {

      function tick() {

        var now = new Date();

        clock.textContent =
          String(now.getHours()).padStart(2, '0') + ':' +
          String(now.getMinutes()).padStart(2, '0');

      }

      tick();
      setInterval(tick, 10000);

    }

    var workspaces = Array.from(topbar.querySelectorAll('.topbar__workspace'));
    var targets = workspaces.map(workspace => document.querySelector(workspace.getAttribute('href'))).filter(Boolean);
    var pending = null;

    function activate(id) {

      workspaces.forEach(workspace => {

        workspace.classList.toggle('topbar__workspace--active', workspace.getAttribute('href') == '#' + id);

      });

    }

    workspaces.forEach(workspace => {

      workspace.addEventListener('click', () => {

        pending = workspace.getAttribute('href').slice(1);

        activate(pending);

      });

    });

    ['wheel', 'touchstart'].forEach(event => {

      document.addEventListener(event, () => { pending = null; }, { passive: true });

    });

    var observer = new IntersectionObserver((entries) => {

      entries.forEach(entry => {

        if(entry.isIntersecting) {

          if(pending) {

            if(entry.target.id == pending) pending = null;

          } else {

            activate(entry.target.id);

          }

        }

      });

    }, { rootMargin: '-30% 0px -60% 0px' });

    targets.forEach(target => observer.observe(target));

  }

}

export { ready };
