/* global window, document, FileReader, FormData */

import $ from 'jquery';
import Cropper from 'cropperjs';

const types = {
  USER_AVATAR: 'useravatar',
  ROOM_DISPLAY: 'roomdisplay',
};

class ImageUpload {
  constructor(elemSelector = '.imageUpload__Form') {
    this.reader = new FileReader();
    this.file = null;
    this.elemSelector = elemSelector;
    this.targetElement = document.querySelector(elemSelector);
    this.type = elemSelector.match(/.*--(\w+)$/)[1];
    this.createImageUpload();
  }

  createImageUpload() {
    if (this.isAdvancedUpload()) {
      const $elem = $(this.targetElement);
      const $form = $elem;
      const $container = $(`${this.elemSelector} .imageUpload__Container`);
      const $input = $(`${this.elemSelector} .imageUpload__File`);
      const $submit = $(`${this.elemSelector} .imageUpload__UploadButton`);
      const $loading = $(`${this.elemSelector} .imageUpload__Loading`);
      const $statusSuccess = $(`${this.elemSelector} .imageUpload__Status--success`);
      const $statusError = $(`${this.elemSelector} .imageUpload__Status--error`);

      const apiUrl = $form.attr('action');
      let dimensions = { width: 0, height: 0 };

      switch (this.type) {
        case types.USER_AVATAR:
          dimensions = { width: 256, height: 256, aspect: 1 };
          break;
        case types.ROOM_DISPLAY:
          dimensions = { width: 320, height: 240, aspect: 1.33 };
          break;
        default:
          break;
      }

      $container.css({ width: dimensions.width, height: dimensions.height });

      $elem
        .on('drag dragstart dragend dragover dragenter dragleave drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
        })
        .on('dragover dragenter', () => {
          $elem.addClass('imageUpload__Container--dragover');
        })
        .on('dragleave dragend drop', () => {
          $elem.removeClass('imageUpload__Container--dragover');
        })
        .on('drop', (e) => {
          this.file = e.originalEvent.dataTransfer.files[0];
          this.reader.readAsDataURL(this.file);
        });

      $input.on('change', (e) => {
        this.file = e.originalEvent.target.files[0];
        this.reader.readAsDataURL(this.file);
      });

      this.reader.addEventListener('load', () => {
        const preview = this.targetElement.querySelector('.imageUpload__Preview');
        $submit.addClass('imageUpload__UploadButton--visible');
        $elem
          .find('.imageUpload__Label')
          .addClass('imageUpload__Label--hasImage');
        preview.src = this.reader.result;
        this.cropper = new Cropper(preview, {
          aspectRatio: dimensions.aspect,
          minCropBoxWidth: dimensions.width,
          minCropBoxHeight: dimensions.height,
          viewMode: 3,
          dragMode: 'move',
        });

        $form.on('submit', (e) => {
          e.preventDefault();


          this.cropper
            .getCroppedCanvas({
              maxWidth: dimensions.width,
              maxHeight: dimensions.height,
            })
            .toBlob((blob) => {
              const formData = new FormData();
              formData.append('image', blob, 'image.png');

              $loading.removeClass('u-hidden');

              $.ajax({
                url: `${apiUrl}`,
                type: 'put',
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
              })
                .done(() => {
                  $statusSuccess.removeClass('u-hidden');
                })
                .fail((xhr) => {
                  if (xhr.status === 413) {
                    $statusError.html('Image is too large (max 512Kb)');
                  }

                  if (xhr.status === 404) {
                    $statusError.html('Could not reach the API');
                  }

                  if (xhr.responseJSON && xhr.responseJSON.message) {
                    $statusError.html(xhr.responseJSON.message);
                  }

                  $statusError.removeClass('u-hidden');
                })
                .always(() => {
                  $loading.addClass('u-hidden');
                });
            });
        });
      });
    }
  }

  isAdvancedUpload() {
    const elem = this.targetElement;
    if (!elem) {
      return false;
    }

    const draggable = (('draggable' in elem) || ('ondragstart' in elem && 'ondrop' in elem));
    return draggable && 'FormData' in window && 'FileReader' in window;
  }
}

export default ImageUpload;
