import $ from 'jquery';

let modal;
$('.modal-trigger').on('click', function openModal(e) {
  const target = $(this).attr('data-target');
  modal = $(`#${target}`);
  modal.addClass('open');
});

$('.modal-btn-close').on('click', (e) => {
  modal.removeClass('open');
});
