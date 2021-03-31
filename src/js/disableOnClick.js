import $ from 'jquery';

$(document).ready(() => {
  const button = $('button.disableOnClick');
  button.each(function () {
    $(this).on('click', function () {
      setTimeout(() => {
        $(this).prop('disabled', true);
      });
    });
  });
});
