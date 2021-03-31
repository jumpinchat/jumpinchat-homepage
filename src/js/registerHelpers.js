import $ from 'jquery';

const usernameInput = $('#register-form [name="username"]');
const usernameText = $('#register-form .register__UsernameText');
const registerSubmit = $('#register-form [type="submit"]');
const checkUsername = (username, cb) => {
  $.ajax({
    method: 'get',
    url: `/api/user/checkusername/${username}`,
  })
    .fail(res => cb(res.responseJSON))
    .done(cb);
};


usernameInput.on('change', function onUsernameInputChange() {
  const elem = $(this);
  checkUsername(elem.val(), (data) => {
    if (data && data.error) {
      registerSubmit.prop('disabled', true);
      return usernameText
        .removeClass('text--green')
        .addClass('text--red')
        .html(data.message);
    }

    registerSubmit.prop('disabled', false);
    return usernameText
      .removeClass('text--red')
      .addClass('text--green')
      .html('Username available!');
  });
});
