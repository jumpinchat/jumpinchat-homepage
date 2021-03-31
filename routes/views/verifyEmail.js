const keystone = require('keystone');
const request = require('request');
const log = require('../../utils/logger')({ name: 'routes.verifyEmail' });
const { api } = require('../../constants/constants');

module.exports = function verifyEmail(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.section = 'Verify Email';
  locals.user = req.user;
  locals.errors = null;
  locals.success = null;

  view.on('init', (next) => {
    request({
      method: 'GET',
      url: `${api}/api/user/verify/email/${req.params.token}`,
      json: true,
    }, (err, response, body) => {
      if (err) {
        log.error('error happened', err);
        return res.status(500).send();
      }

      if (response.statusCode >= 400) {
        if (body && body.message) {
          log.error({ err: body.message }, 'error verifying email');
          locals.errors = body.message;
          return next();
        }

        locals.errors = 'Failed to validate your email, sorry!';
        return next();
      }

      locals.success = 'Your email has been verified, thanks!';
      return next();
    });
  });

  // Render the view
  view.render('verifyEmail');
};
