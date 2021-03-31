import $ from 'jquery';

const userIgnoreRemove = $('.settings__UserIgnoreRemove');

const removeIgnore = (id, username, element) => {
  $.ajax({
    method: 'delete',
    url: '/settings/ignore',
    data: {
      id,
      username,
    },
  })
    .done(() => {
      element.remove();
    });
};

userIgnoreRemove.on('click', function handleRemoveIgnore() {
  const elem = $(this);
  removeIgnore(elem.data('id'), elem.data('username'), elem.parent());
});
