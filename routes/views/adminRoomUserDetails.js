const keystone = require('keystone');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const log = require('../../utils/logger')({ name: 'routes.adminRoomUserDetails' });
const config = require('../../config');
const {
  getRoomByName,
  sendBan,
} = require('../../utils/roomUtils');
const {
  banReasons,
} = require('../../constants/constants');

module.exports = function adminRoomUserDetails(req, res) {
  let token;
  const view = new keystone.View(req, res);
  const { locals } = res;

  const {
    success,
    error,
  } = req.query;

  const roomName = req.params.room;
  const { userListId } = req.params;

  locals.section = `Admin | Room ${roomName} | User ${userListId}`;
  locals.page = 'rooms';
  locals.user = req.user;
  locals.room = {};
  locals.roomUser = {};
  locals.banReasons = banReasons;
  locals.error = error || null;
  locals.success = success || null;

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
      const roomUser = room.users.find(u => String(u._id) === userListId);
      locals.roomUser = roomUser;


      if (!locals.roomUser) {
        log.warn('user not found');
        return res.status(404).send({ error: 'user not found' });
      }

      locals.isMod = !!room.settings.moderators
        .find(m => m.user_id === roomUser.user_id || m.session_token === roomUser.session_id);

      return next();
    });
  });

  view.on('post', { action: 'siteban' }, async (next) => {
    log.debug({ body: req.body });
    locals.error = null;
    const schema = Joi.object().keys({
      reason: Joi.string().required(),
      duration: Joi.number().required(),
      restrictBroadcast: Joi.boolean().truthy('on'),
      restrictJoin: Joi.boolean().truthy('on'),
    });

    const requestBody = {
      reason: req.body.reason,
      duration: req.body.duration,
      restrictBroadcast: req.body.restrictBroadcast === 'on',
      restrictJoin: req.body.restrictJoin === 'on',
    };

    try {
      const {
        reason,
        duration,
        restrictBroadcast,
        restrictJoin,
      } = await Joi.validate(requestBody, schema);

      if (!restrictBroadcast && !restrictJoin) {
        locals.error = 'Select at least one ban type';
        return next();
      }

      const expire = new Date(Date.now() + (1000 * 60 * 60 * Number(duration)));
      const type = { restrictJoin, restrictBroadcast };

      try {
        locals.success = await sendBan(token, reason, type, locals.roomUser, expire);
        return next();
      } catch (err) {
        log.error({ err }, 'error sending ban request');
        locals.error = err;
        return next();
      }
    } catch (err) {
      log.error({ err }, 'validation error');
      if (err.name === 'ValidationError') {
        locals.error = 'Invalid request, reason probably missing';
      } else {
        locals.error = 'Verification error';
      }

      return next();
    }
  });

  view.render('adminRoomUserDetails');
};
