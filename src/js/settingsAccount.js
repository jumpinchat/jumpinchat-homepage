import $ from 'jquery';

const resendButton = $('#send-verification-email');
const isVerifiedString = $('#is-verified-string');

const sendVerification = () => {
  $.ajax({
    method: 'post',
    url: '/api/user/verify/email',
    data: { },
    statusCode: {
      429: (xhr) => {
        isVerifiedString.html('Too many attempts, try again in a few minutes');
      },
    },
  })
    .done(() => {
      resendButton.remove();
      isVerifiedString.removeClass('text--red');
      isVerifiedString.addClass('text--green');
      isVerifiedString.html('Verification email sent.');
    });
};

resendButton.on('click', () => {
  sendVerification();
});
