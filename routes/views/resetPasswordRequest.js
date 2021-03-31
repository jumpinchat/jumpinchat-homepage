const keystone = require('keystone');
const request = require('request');
const Joi = require('joi');
const log = require('../../utils/logger')({ name: 'routes.resetPasswordRequest' });
const { errors, api } = require('../../constants/constants');

module.exports = function resetPasswordRequest(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.section = 'Reset Password';
  locals.user = req.user;
  locals.errors = null;
  locals.success = null;

  view.on('init', (next) => {
    if (locals.user) {
      return res.redirect('/settings/account');
    }

    return next();
  });

  view.on('post', { action: 'requestResetPassword' }, (next) => {
    const schema = Joi.object().keys({
      username: Joi.string().alphanum().required(),
    });

    const user = {
      username: req.body.username,
    };

    Joi.validate(user, schema, { abortEarly: false }, (err, validated) => {
      if (err) {
        locals.errors = errors.ERR_VALIDATION;
        return next();
      }

      const { username } = validated;

      return request({
        method: 'POST',
        url: `${api}/api/user/password/request`,
        body: { username },
        json: true,
      }, (err, response, body) => {
        if (err) {
          log.fatal({ err }, 'error calling password reset endpoint');
          return res.status(500).send();
        }

        if (response.statusCode >= 400) {
          if (body && body.message) {
            locals.errors = body.message;
            return next();
          }

          locals.errors = 'Failed to send password reset email';
          return next();
        }

        locals.success = 'A password reset code has been sent to your email address';
        return next();
      });
    });
  });

  // Render the view
  view.render('resetPasswordRequest');
};
