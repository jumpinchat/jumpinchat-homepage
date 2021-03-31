const keystone = require('keystone');
const request = require('request');
const Joi = require('joi');
const log = require('../../utils/logger')({ name: 'routes.resetPassword' });
const { errors, api } = require('../../constants/constants');

module.exports = function resetPassword(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.section = 'Reset Password';
  locals.user = req.user;
  locals.errors = null;
  locals.success = null;
  locals.verified = false;
  locals.userId = null;

  view.on('init', (next) => {
    request({
      method: 'GET',
      url: `${api}/api/user/password/reset/${req.params.token}`,
      json: true,
    }, (err, response, body) => {
      if (err) {
        log.error({ err }, 'error happened');
        return res.status(500).send();
      }

      if (response.statusCode >= 400) {
        if (body && body.message) {
          locals.errors = body.message;
          return next();
        }

        locals.errors = 'Unable to verify reset token :(';
        return next();
      }

      locals.verified = true;
      locals.userId = response.body.userId;
      return next();
    });
  });

  view.on('post', { action: 'resetPassword' }, (next) => {
    const schema = Joi.object().keys({
      password: Joi.string().required(),
      passwordRepeat: Joi.string().required(),
    });

    const { password, passwordRepeat } = req.body;

    const body = {
      password,
      passwordRepeat,
    };

    Joi.validate(body, schema, { abortEarly: false }, (err, validated) => {
      if (err) {
        locals.errors = errors.ERR_VALIDATION;
        return next();
      }

      if (validated.password !== validated.passwordRepeat) {
        locals.errors = 'Passwords do not match';
        return next();
      }

      return request({
        method: 'POST',
        url: `${api}/api/user/password/reset`,
        body: { password: validated.password, userId: locals.userId },
        json: true,
      }, (err, response, body) => {
        if (err) {
          log.error('error happened', err);
          return res.status(500).send();
        }

        log.debug('response', response.statusCode);

        if (response.statusCode >= 400) {
          if (body && body.message) {
            locals.errors = body.message;
            return next();
          }

          locals.errors = 'Failed to reset password';
          return next();
        }

        locals.success = 'Your password has been reset';
        return next();
      });
    });
  });

  // Render the view
  view.render('resetPassword');
};
