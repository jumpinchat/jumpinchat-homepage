/**
 * Created by Zaccary on 19/03/2017.
 */

const fs = require('fs');
const keystone = require('keystone');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const request = require('request');
const url = require('url');
const bcrypt = require('bcrypt');
const log = require('../../utils/logger')({ name: 'settings view' });
const config = require('../../config');
const { getRoomByName } = require('../../utils/roomUtils');
const {
  errors,
  successMessages,
  api,
  videoQuality,
} = require('../../constants/constants');
const {
  getUserByUsername,
  getUserById,
  generatePassHash,
} = require('../../utils/userUtils');

const User = keystone.list('User');

module.exports = function settings(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  let token;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.page = req.params.page;
  locals.section = `Settings | ${locals.page}`;
  locals.user = req.user;
  locals.room = null;
  locals.error = req.query.error || null;
  locals.success = req.query.success || null;
  locals.isGold = false;
  locals.supportExpires = null;
  locals.videoQuality = videoQuality;

  const pages = [
    'account',
    'profile',
    'room',
    'user',
  ];

  view.on('init', (next) => {
    if (!locals.user) {
      return res.redirect('/');
    }

    if (!locals.page) {
      return res.redirect('/settings/profile');
    }

    if (pages.indexOf(locals.page) < 0) {
      return res.redirect('/settings/profile');
    }

    token = jwt.sign(String(req.user._id), config.auth.jwtSecret);
    const { supportExpires } = locals.user.attrs;
    const isGold = locals.user.attrs.isGold
      || (supportExpires && moment(supportExpires).isAfter(moment()));

    locals.isGold = isGold;
    if (supportExpires && moment(supportExpires).isAfter(moment())) {
      locals.supportExpires = moment(supportExpires).calendar();
    }

    return getRoomByName(locals.user.username, async (err, room) => {
      if (err) {
        return res.status(500).send();
      }

      if (!room) {
        return res.redirect('/');
      }

      locals.room = room;
      return next();
    });
  });


  view.on('post', { action: 'profile' }, (next) => {
    const schema = Joi.object().keys({
      dobMonth: Joi.number().integer().min(1).max(12),
      dobDay: Joi.number().integer().min(1).max(31),
      bio: Joi.string().allow(''),
      location: Joi.string().max(50).allow(''),
    });

    Joi.validate({
      dobMonth: req.body.dobMonth,
      dobDay: req.body.dobDay,
      bio: req.body.bio,
      location: req.body.location,
    }, schema, { abortEarly: false }, (err, validated) => {
      if (err) {
        if (err.name === 'ValidationError') {
          log.warn({ err });
          locals.errors = errors.ERR_VALIDATION;
        } else {
          log.fatal({ err });
          locals.errors = errors.ERR_SRV;
        }

        return next();
      }

      if (validated.dobMonth && validated.dobDay) {
        const dateValid = moment({
          year: 1970,
          month: validated.dobMonth - 1,
          day: validated.dobDay,
        }).isValid();

        if (!dateValid) {
          locals.error = 'Invalid date';
          return next();
        }
      }

      User.model.findOne({ _id: locals.user._id }, (userFindErr, user) => {
        if (userFindErr) {
          locals.error = errors.ERR_SRV;
          return next();
        }

        user.profile = Object.assign({}, user.profile, {
          bio: validated.bio,
          location: validated.location,
          dob: {
            month: validated.dobMonth,
            day: validated.dobDay,
          },
        });

        return user.save((userSaveErr, updatedUser) => {
          if (userSaveErr) {
            locals.error = errors.ERR_SRV;
            return next();
          }

          locals.user = updatedUser;
          locals.success = successMessages.MSG_SETTINGS_UPDATED;
          return next();
        });
      });
    });
  });

  view.on('post', { action: 'room' }, (next) => {
    const schema = Joi.object().keys({
      public: Joi.boolean(),
      forcePtt: Joi.boolean(),
      requireVerifiedEmail: Joi.boolean(),
      forceUser: Joi.boolean(),
      minAccountAge: Joi.number().allow(''),
      description: Joi.string().max(140).allow(''),
    });

    Joi.validate({
      public: req.body.public,
      description: req.body.description,
      forcePtt: req.body.forcePtt,
      forceUser: req.body.forceUser,
      requireVerifiedEmail: req.body.requireVerifiedEmail,
      minAccountAge: req.body.minAccountAge,
    }, schema, (err, validated) => {
      if (err) {
        if (err.name === 'ValidationError') {
          log.warn({ err });
          locals.error = errors.ERR_VALIDATION;
        } else {
          log.fatal({ err });
          locals.error = errors.ERR_SRV;
        }

        return next();
      }

      locals.room.settings.public = validated.public;
      locals.room.settings.description = validated.description;
      locals.room.settings.forcePtt = validated.forcePtt;
      locals.room.settings.forceUser = validated.forceUser;

      locals.room.settings.minAccountAge = validated.minAccountAge === ''
        ? null
        : validated.minAccountAge;

      if (locals.room.settings.minAccountAge && !locals.room.settings.forceUser) {
        locals.room.settings.forceUser = true;
      }

      locals.room.settings.requireVerifiedEmail = validated.requireVerifiedEmail;
      if (locals.room.settings.requireVerifiedEmail && !locals.room.settings.forceUser) {
        locals.room.settings.forceUser = true;
      }

      locals.room.save((err, savedRoom) => {
        if (err) {
          log.fatal('error saving room', err);
          return res.status(500).send();
        }

        locals.success = 'Room settings updated';
        locals.room = savedRoom;
        return next();
      });
    });
  });

  view.on('post', { action: 'roompass' }, async (next) => {
    const schema = Joi.object().keys({
      password: Joi.string().allow(''),
    });

    try {
      const { password } = await Joi.validate({ password: req.body.password }, schema);

      if (!password.length) {
        log.debug('no password');
        locals.room.settings.passhash = null;

        try {
          locals.room = await locals.room.save();
          locals.success = 'Room password saved';
          return next();
        } catch (err) {
          log.fatal({ err }, 'failed to save room password');
          locals.error = errors.ERR_SRV;
          return res.status(500).send(errors.ERR_SRV);
        }
      }
      return generatePassHash(password || '', async (genPassErr, passhash) => {
        if (genPassErr) {
          locals.error = errors.ERR_SRV;
          return next();
        }

        locals.room.settings.passhash = passhash;

        try {
          locals.room = await locals.room.save();
          locals.success = 'Room password saved';
          return next();
        } catch (err) {
          log.fatal({ err }, 'failed to save room password');
          locals.error = errors.ERR_SRV;
          return res.status(500).send(errors.ERR_SRV);
        }
      });
    } catch (err) {
      if (err.name === 'ValidationError') {
        log.error({ err }, 'validation error');
        locals.error = errors.ERR_VALIDATION;
        return next();
      }

      log.fatal({ err }, 'error');
      return res.status(500).send(errors.ERR_SRV);
    }
  });

  view.on('post', { action: 'setAgeRestricted' }, async (next) => {
    const { passhash } = req.user.auth;
    const { password } = req.body;

    try {
      const result = await bcrypt.compare(password, passhash);

      if (!result) {
        return res.redirect(url.format({
          path: './',
          query: {
            error: 'Password is incorrect',
          },
        }));
      }
    } catch (err) {
      log.fatal({ err }, 'error checking passwords');
      return res.status(500).send();
    }

    if (!password) {
      return res.redirect(url.format({
        path: './',
        query: {
          error: 'Password is required',
        },
      }));
    }

    request({
      url: `${api}/api/rooms/${locals.room.name}/setAgeRestricted`,
      method: 'PUT',
      headers: {
        Authorization: token,
      },
      json: true,
    }, (err, response, body) => {
      if (err) {
        log.fatal({ err }, 'error happened');
        locals.error = 'Failed save room settings';
        return res.status(500).send();
      }

      if (response.statusCode >= 400) {
        log.warn({ body, status: response.statusCode }, 'failed to save room settings');
        if (body && body.message) {
          locals.error = body.message;
          return next();
        }

        log.warn('failed to save room settings', { body, code: response.statusCode });

        return res.redirect(url.format({
          path: './',
          query: {
            success: 'Failed to save room settings',
          },
        }));
      }

      return res.redirect(url.format({
        path: './',
        query: {
          success: 'Room settings updated',
        },
      }));
    });
  });

  view.on('post', { action: 'user' }, (next) => {
    const {
      playYtVideos,
      allowPrivateMessages,
      pushNotificationsEnabled,
      receiveUpdates,
      receiveMessageNotifications,
      darkTheme,
    } = req.body;

    request({
      url: `${api}/api/user/${locals.user._id}/settings`,
      method: 'post',
      headers: {
        Authorization: token,
      },
      body: {
        playYtVideos,
        allowPrivateMessages,
        pushNotificationsEnabled,
        receiveUpdates,
        receiveMessageNotifications,
        darkTheme,
      },
      json: true,
    }, (err, response, body) => {
      if (err) {
        log.fatal({ err }, 'error happened');
        locals.error = 'Failed to save user settings';
        return res.status(500).send();
      }

      if (response.statusCode >= 400) {
        log.warn({ body, status: response.statusCode }, 'failed to save user settings');
        if (body && body.message) {
          locals.error = body.message;
          return next();
        }

        log.warn('failed to save user settings', { body, code: response.statusCode });
        locals.error = 'Failed to save user settings';
        return next();
      }

      getUserById(locals.user._id, true, (err, user) => {
        if (err) {
          log.fatal({ err }, 'error fetching user');
          return res.status(500).send();
        }

        if (!user) {
          log.warn('could not find user');
          return res.redirect('/');
        }

        locals.user = user;
        locals.success = 'User settings saved';

        return next();
      });
    });
  });

  view.on('post', { action: 'userListIcon' }, (next) => {
    const { files } = req;
    if (!files.image) {
      locals.error = 'Image not found';
      return next();
    }

    const formData = {
      image: {
        value: fs.createReadStream(files.image.path),
        options: {
          filename: files.image.originalname,
          contentType: files.image.mimetype,
        },
      },
    };

    return request({
      url: `${api}/api/user/${locals.user._id}/uploadUserIcon`,
      method: 'put',
      formData,
      headers: {
        authorization: token,
      },
    }, (err, response, body) => {
      if (err) {
        log.fatal({ err }, 'error happened');
        locals.error = 'Failed to upload image';
        return res.status(500).send();
      }

      if (response.statusCode >= 400) {
        log.warn({ body, status: response.statusCode }, 'failed to upload user icon');
        if (body && body.message) {
          locals.error = body.message;
          return next();
        }

        log.warn({ body, code: response.statusCode }, 'failed upload user icon');
        locals.error = 'Failed to upload image';
        return next();
      }

      locals.success = 'User icon uploaded';

      return next();
    });
  });


  view.on('post', { action: 'ignore' }, (next) => {
    const schema = Joi.object().keys({
      username: Joi.string(),
    });

    Joi.validate({
      username: req.body.username,
    }, schema, (err, validated) => {
      if (err) {
        log.warn(err);
        locals.error = errors.ERR_VALIDATION;
        return next();
      }

      if (locals.room.settings.moderators.find(mod => mod.username === validated.username)) {
        return next();
      }

      getUserByUsername(validated.username.toLowerCase(), (err, user) => {
        if (err) {
          locals.error = errors.ERR_SRV;
          return next();
        }

        if (!user) {
          locals.error = 'User name not found';
          return next();
        }

        const userIgnored = locals.user.settings.ignoreList
          .find(u => String(u.userId) === String(user._id));

        if (userIgnored) {
          locals.error = 'User already ignored';
          return next();
        }

        locals.user.settings.ignoreList = [
          ...locals.user.settings.ignoreList,
          {
            handle: user.username,
            timestamp: Date.now(),
            userId: user._id,
          },
        ];

        locals.user.save((err, savedUser) => {
          if (err) {
            log.fatal({ err }, 'error saving room');
            return res.status(500).send();
          }

          locals.user = savedUser;
          locals.success = 'User settings saved';
          return next();
        });
      });
    });
  });

  view.on('post', { action: 'videoQuality' }, async (next) => {
    const { quality } = req.body;

    try {
      const user = await getUserById(locals.user._id, false);
      user.settings.videoQuality = quality;
      locals.user = await user.save();
      locals.success = 'User settings saved';
      return next();
    } catch (err) {
      log.fatal({ err }, 'failed to retrieve user');
      return res.status(500).send();
    }
  });


  view.render('settings');
};
