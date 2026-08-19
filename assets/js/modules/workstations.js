function ready() {

  var modal = document.querySelector('.workstations__modal');

  if(modal) {

    var modalImages = document.querySelectorAll('.workstations__image');
    var modalBackdrop = modal.querySelector('.workstations__backdrop');
    var modalContainer = modal.querySelector('.workstations__container');

    if(modalImages) {

      modalImages.forEach(image => {

        image.addEventListener('click', (e) => {

          open(e.currentTarget.querySelector('figure'));

        });

      });

    }

    modalBackdrop.addEventListener('click', () => {

      close();

    });

    modal.addEventListener('close', () => {

      modalContainer.replaceChildren();

      modal.scrollTo(0, 0);

    });

    function open(element) {

      var modalImage = document.createElement('div');
      var modalFigure = element.cloneNode(true);

      modalImage.classList.add('workstations__image', 'workstations__image--modal');

      modalFigure.querySelector('img').removeAttribute('loading');

      modalImage.append(modalFigure);

      modalContainer.replaceChildren(modalImage);

      modalImage.addEventListener('click', () => {

        close();

      });

      modal.showModal();

    }

    function close() {

      modal.close();

    }

  }

}

export { ready };
