const keystone = require('keystone');
const request = require('request');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const log = require('../../utils/logger')({ name: 'routes.admin' });
const config = require('../../config');
const { getRoomByName } = require('../../utils/roomUtils');
const {
  api,
  errors,
  closeReasons,
} = require('../../constants/constants');

module.exports = function adminRoomDetails(req, res) {
  let token;
  const view = new keystone.View(req, res);
  const { locals } = res;


  const roomName = req.params.room;
  locals.section = `Admin | Room ${roomName}`;
  locals.page = 'rooms';
  locals.user = req.user;
  locals.room = {};
  locals.closeReasons = closeReasons;

  view.on('init', async (next) => {
    token = await jwt.sign({ userId: String(locals.user._id) }, config.auth.jwtSecret, { expiresIn: '1h' });
    return getRoomByName(roomName, (err, room) => {
      if (err) {
        log.fatal({ err }, 'error getting room');
        return res.status(500).send({ error: 'error getting room' });
      }

      if (!room) {
        log.error('room not found');
        return res.status(404).send({ error: 'room not found' });
      }

      locals.room = room;
      return next();
    });
  });

  view.on('post', { action: 'room' }, (next) => {
    const schema = Joi.object().keys({
      active: Joi.boolean().required(),
      public: Joi.boolean().required(),
    });

    const body = {
      active: req.body.active,
      public: req.body.public,
    };

    Joi.validate(body, schema, { abortEarly: false }, (err, validated) => {
      if (err) {
        log.warn({ err }, 'invalid message');
        locals.error = errors.ERR_VALIDATION;
        return next();
      }

      locals.room.attrs.active = validated.active;
      locals.room.settings.public = validated.public;

      locals.room.save((err, savedRoom) => {
        if (err) {
          log.fatal({ err }, 'failed to save room');
          locals.error = 'Failed to save room';
          return next();
        }

        locals.room = savedRoom;
        locals.success = 'Room saved';
        return next();
      });
    });
  });

  view.on('post', { action: 'close' }, (next) => {
    const schema = Joi.object().keys({
      reason: Joi.string().required(),
    });

    const body = {
      reason: req.body.reason,
    };

    Joi.validate(body, schema, { abortEarly: false }, (err, { reason }) => {
      if (err) {
        log.warn({ err }, 'invalid reason');
        locals.error = 'invalid reason';
        return next();
      }

      return request({
        method: 'POST',
        url: `${api}/api/admin/rooms/${locals.room.name}/close`,
        headers: {
          Authorization: token,
        },
        body,
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

          log.error({ statusCode: response.statusCode }, 'error getting room list');
          locals.error = `error happened: ${response.statusCode}`;
          return next();
        }

        locals.success = 'Room closed';
        return next();
      });
    });
  });

  view.on('post', { action: 'server-message' }, (next) => {
    const schema = Joi.object().keys({
      message: Joi.string().required(),
      type: Joi.string().required(),
    });

    const body = {
      message: req.body.message,
      type: req.body['message-type'],
    };

    Joi.validate(body, schema, { abortEarly: false }, (err, validatedLogin) => {
      if (err) {
        log.warn({ err }, 'invalid message');
        locals.error = 'invalid message';
        return next();
      }

      return request({
        method: 'POST',
        url: `${api}/api/admin/notify`,
        headers: {
          Authorization: token,
        },
        body: Object.assign(body, {
          room: locals.room.name,
        }),
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

          log.error({ statusCode: response.statusCode }, 'error getting room list');
          locals.error = 'error happened';
          return next();
        }

        locals.success = 'Message sent successfully';
        return next(null, body);
      });
    });
  });

  view.render('adminRoomDetails');
};
