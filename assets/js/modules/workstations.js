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

    document.addEventListener('keydown', (e) => {

      if(e.keyCode == 27) close();

    });

    function open(element) {

      var elementImg = element.querySelector('img');
      var elementFigcaption = element.querySelector('figcaption');

      var figureImgSrc = elementImg.src;
      var figureImgAlt = elementImg.alt;
      var figureFigcaption = elementFigcaption ? elementFigcaption.textContent : '';

      modalContainer.innerHTML = `
        <div class="workstations__image workstations__image--modal">
          <figure>
            <img src="${figureImgSrc}" alt="${figureImgAlt}" loading="lazy" decoding="async">
            ${figureFigcaption ? `<figcaption>${figureFigcaption}</figcaption>` : ''}
          </figure>
        </div>
      `;

      var modalImage = modalContainer.querySelector('.workstations__image');

      modalImage.addEventListener('click', () => {

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
