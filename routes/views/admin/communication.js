const keystone = require('keystone');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const request = require('request');
const log = require('../../../utils/logger')({ name: 'routes.roomCloseDetail' });
const config = require('../../../config');

const {
  api,
  errors,
} = require('../../../constants/constants');

module.exports = function adminRoomCloseList(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  const { success, error, page = 1 } = req.query;
  let token;

  locals.section = 'Admin | Communication';
  locals.page = 'communication';
  locals.user = req.user;
  locals.error = error || null;
  locals.success = success || null;

  view.on('init', async (next) => {
    try {
      token = await jwt.sign({ userId: String(locals.user._id) }, config.auth.jwtSecret, { expiresIn: '1h' });
    } catch (err) {
      log.fatal({ err }, 'failed to create token');
      return res.status(500).send(err);
    }
    return next();
  });

  view.on('post', { action: 'message' }, async (next) => {
    const schema = Joi.object().keys({
      message: Joi.string().required(),
    });

    const body = {
      message: req.body.message,
    };

    try {
      const { message } = await Joi.validate(body, schema, { abortEarly: false });

      log.debug({ message, body: req.body });

      return request({
        method: 'POST',
        url: `${api}/api/message/admin/send`,
        headers: {
          Authorization: token,
        },
        body: {
          message,
        },
        json: true,
      }, (err, response, responseBody) => {
        if (err) {
          log.error({ err }, 'error happened');
          locals.error = 'error happened';
          return next();
        }

        if (response.statusCode >= 400) {
          if (responseBody && responseBody.message) {
            locals.error = responseBody.message;
            return next();
          }

          log.error({ statusCode: response.statusCode }, 'error sending email');
          locals.error = 'error happened';
          return next();
        }

        locals.success = 'Message sent successfully';
        return res.redirect(`/admin/communication?success=${locals.success}`);
      });
    } catch (err) {
      if (err) {
        log.warn({ err }, 'invalid message');
        locals.errors = errors.ERR_VALIDATION;
        return next();
      }
    }
  });

  view.render('admin/communication');
};
