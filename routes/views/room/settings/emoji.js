const keystone = require('keystone');
const request = require('request');
const moment = require('moment');
const fs = require('fs');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const log = require('../../../../utils/logger')({ name: 'room.settings' });
const { api } = require('../../../../constants/constants');
const config = require('../../../../config');
const { getRoomEmoji } = require('../../../../utils/roomUtils');
const { getUserById } = require('../../../../utils/userUtils');

const Room = keystone.list('Room');

function checkHasRolePermission(userId, roomName) {
  return new Promise((resolve, reject) => request({
    url: `${api}/api/role/permission/${userId}/room/${roomName}?permission=manageEmoji`,
    method: 'GET',
  }, (err, response, body) => {
    if (err) {
      log.fatal({ err }, 'error happened');
      return reject(err);
    }

    if (response.statusCode >= 400) {
      if (body && body.message) {
        return reject(body.message);
      }

      return reject(new Error('Server error'));
    }

    return resolve();
  }));
}

async function checkUserIsMod(userId, room) {
  let hasPermission = false;
  try {
    hasPermission = await checkHasRolePermission(userId, room.name);
  } catch (err) {
    log.error({ err }, 'failed to check permission');
  }

  const isOwner = String(room.attrs.owner) === String(userId);

  return hasPermission || isOwner;
}

function roomIsGold(roomOwner) {
  const { isGold, supportExpires } = roomOwner.attrs;
  const supportExpired = !supportExpires || moment(supportExpires).isBefore(moment());

  return isGold || !supportExpired;
}

module.exports = function roomSettings(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  const { roomName } = req.params;
  const {
    success,
    error,
  } = req.query;
  let token;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.section = `${roomName} | Settings`;
  locals.page = 'emoji';
  locals.user = req.user;
  locals.room = null;
  locals.roomOwner = null;
  locals.roomGold = false;
  locals.emoji = [];
  locals.error = error;
  locals.success = success;

  view.on('init', async (next) => {
    if (locals.user) {
      token = jwt.sign(String(req.user._id), config.auth.jwtSecret);
    }


    try {
      locals.room = await Room.model.findOne({ name: roomName });

      if (!locals.room || !locals.room.attrs.owner) {
        return res.redirect('/');
      }

      if (locals.user) {
        locals.roomOwner = await getUserById(locals.room.attrs.owner);
        locals.roomGold = roomIsGold(locals.roomOwner);
        locals.userIsMod = checkUserIsMod(String(locals.user._id), locals.room);
      }

      locals.emoji = await getRoomEmoji(roomName);
    } catch (err) {
      log.fatal({ err, roomName }, 'failed to fetch room');
      return res.status(500).end();
    }

    return next();
  });

  view.on('post', { action: 'uploadEmoji' }, async () => {
    const { files } = req;
    const schema = Joi.object().keys({
      alias: Joi.string().alphanum().max(12),
    });

    try {
      const { alias } = await Joi.validate({ alias: req.body.alias }, schema);
      const formData = {
        image: {
          value: fs.createReadStream(files.image.path),
          options: {
            filename: files.image.originalname,
            contentType: files.image.mimetype,
          },
        },
        alias,
        userId: String(locals.user._id),
      };

      return request({
        url: `${api}/api/rooms/${locals.room.name}/uploadEmoji`,
        method: 'POST',
        formData,
        headers: {
          authorization: token,
        },
        json: true,
      }, (err, response, body) => {
        if (err) {
          log.fatal({ err }, 'error happened');
          locals.error = 'Failed to upload image';
          return res.status(500).send();
        }

        if (response.statusCode >= 400) {
          if (body && body.message) {
            locals.error = body.message;
            return res.redirect(`?error=${locals.error}`);
          }

          log.warn({ body, code: response.statusCode }, 'failed upload emoji');
          locals.error = 'Failed to upload image';
          return res.redirect(`?error=${locals.error}`);
        }

        locals.success = 'Emoji uploaded';

        return res.redirect(`?success=${locals.success}`);
      });
    } catch (err) {
      if (err.name === 'ValidationError') {
        locals.error = 'Required field missing';
      } else {
        locals.error = 'Failed to upload image';
      }

      return res.redirect(`?error=${locals.error}`);
    }
  });


  view.on('post', { action: 'removeEmoji' }, async () => {
    const { emojiId } = req.body;
    return request({
      url: `${api}/api/rooms/emoji/${emojiId}`,
      method: 'DELETE',
      body: {
        userId: locals.user._id,
        emojiId,
      },
      headers: {
        authorization: token,
      },
      json: true,
    }, (err, response, body) => {
      if (err) {
        log.fatal({ err }, 'error happened');
        locals.error = 'Failed to remove image';
        return res.status(500).send();
      }

      if (response.statusCode >= 400) {
        if (body && body.message) {
          locals.error = body.message;
          return res.redirect(`?error=${locals.error}`);
        }

        log.warn({ body, code: response.statusCode }, 'failed remove emoji');
        locals.error = 'Failed to remove emoji';
        return res.redirect(`?error=${locals.error}`);
      }

      locals.success = 'Emoji removed';

      return res.redirect(`?success=${locals.success}`);
    });
  });

  view.render('room/settings/emoji');
};
