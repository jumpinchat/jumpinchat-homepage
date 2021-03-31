import $ from 'jquery';

const removeModButton = $('.settings__RoomModRemove');

const removeMod = (username, element) => {
  $.ajax({
    method: 'delete',
    url: '/settings/moderator',
    data: { username },
  })
    .done(() => {
      element.remove();
    });
};

removeModButton.on('click', function handleRemoveMod() {
  const elem = $(this);
  removeMod(elem.data('username'), elem.parent());
});
