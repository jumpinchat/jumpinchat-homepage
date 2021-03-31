const keystone = require('keystone');
const moment = require('moment');
const Joi = require('joi');
const url = require('url');
const log = require('../../../../utils/logger')({ name: 'room.settings' });
const { getUserById } = require('../../../../utils/userUtils');
const {
  getRoomByName,
  checkUserIsMod,
} = require('../../../../utils/roomUtils');
const { errors } = require('../../../../constants/constants');

module.exports = function roomSettings(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  const { roomName } = req.params;
  const {
    success,
    error,
  } = req.query;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.section = `${roomName} | Settings`;
  locals.page = 'info';
  locals.user = req.user;
  locals.room = null;
  locals.roomOwner = null;
  locals.supportExpires = null;
  locals.supportValid = true;
  locals.userIsMod = false;
  locals.error = error;
  locals.success = success;

  view.on('init', async (next) => {
    try {
      locals.room = await getRoomByName(roomName);

      if (!locals.room || !locals.room.attrs.owner) {
        return res.redirect('/');
      }


      if (locals.user) {
        locals.userIsMod = checkUserIsMod(String(locals.user._id), locals.room);
      }
      locals.roomOwner = await getUserById(locals.room.attrs.owner);

      const { supportExpires } = locals.roomOwner.attrs;
      const supportValid = moment(supportExpires).isAfter(moment()) || false;

      locals.supportValid = supportValid;
      if (supportValid) {
        locals.supportExpires = moment(supportExpires).format();
      }
    } catch (err) {
      log.fatal({ err, roomName }, 'failed to fetch room');
      return res.status(500).end();
    }

    return next();
  });

  view.on('post', { action: 'topic' }, async () => {
    if (!locals.userIsMod) {
      return res.status(401).send();
    }

    const schema = Joi.object().keys({
      topic: Joi.string().max(140).allow(''),
    });

    try {
      const { topic } = await Joi.validate({ topic: req.body.topic }, schema);
      locals.room.settings.topic = {
        text: topic,
        updatedAt: new Date(),
        updatedBy: locals.user._id,
      };

      locals.room = await locals.room.save();
      locals.success = 'Room settings saved';
      return res.redirect(url.format({
        path: './',
        query: {
          success: locals.success,
        },
      }));
    } catch (err) {
      if (err.name === 'ValidationError') {
        locals.error = errors.ERR_VALIDATION;
      } else {
        locals.error = errors.ERR_SRV;
      }

      return res.redirect(url.format({
        path: './',
        query: {
          error: locals.error,
        },
      }));
    }
  });

  view.render('room/settings/info');
};
