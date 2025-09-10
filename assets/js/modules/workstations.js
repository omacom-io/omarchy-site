function ready() {

  var modal = document.querySelector('.workstations__modal');

  if(modal) {

    var modalImages = document.querySelectorAll('.workstations__images img');
    var modalBackdrop = modal.querySelector('.workstations__backdrop');
    var modalContainer = modal.querySelector('.workstations__container');

    if(modalImages) {

      modalImages.forEach(image => {

        image.addEventListener('click', (e) => {

          open(e.currentTarget.src);

        });

      });

    }

    modalBackdrop.addEventListener('click', () => {

      close();

    });

    document.addEventListener('keydown', (e) => {

      if(e.keyCode == 27) close();

    });

    function open(src) {

      modalContainer.innerHTML = `
        <figure class="workstations__figure">
          <img src="${src}" alt="">
        </figure>
      `;

      var modalFigure = modalContainer.querySelector('.workstations__figure');

      modalFigure.addEventListener('click', () => {

        close();

      });

      modal.showModal();

    }

    function close() {

      modalContainer.innerHTML = '';

      modal.scrollTo(0, 0);
      modal.close();

    }

  }

}

export { ready };
