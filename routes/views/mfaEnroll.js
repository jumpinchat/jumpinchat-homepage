const keystone = require('keystone');
const url = require('url');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const { api } = require('../../constants/constants');
const log = require('../../utils/logger')({ name: 'settings.account.mfa' });
const request = require('../../utils/request');

module.exports = function mfaEnroll(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  const { error } = req.query;
  let token;

  locals.section = 'Enroll MFA';
  locals.description = 'Secure your account by enrolling in MFA';
  locals.user = req.user;
  locals.mfaQr = null;
  locals.error = error || null;

  view.on('init', async (next) => {
    if (!locals.user) {
      return res.redirect('/');
    }

    token = jwt.sign(String(req.user._id), config.auth.jwtSecret);

    if (locals.mfaQr) {
      return next();
    }

    try {
      const response = await request({
        method: 'GET',
        url: `${api}/api/user/mfa/request`,
        json: true,
        headers: {
          Authorization: token,
        },
      });

      locals.mfaQr = response.qrUrl;
    } catch (err) {
      if (err.message) {
        locals.error = 'Failed to request enrollment information';
      } else {
        locals.error = err;
      }
    }

    return next();
  });

  view.on('post', { action: 'verify' }, async () => {
    locals.error = null;
    const schema = Joi.object().keys({
      token: Joi.string().min(6).max(6).required(),
    });

    try {
      await Joi.validate({
        token: req.body.token,
      }, schema);
    } catch (err) {
      locals.error = 'invalid token';
      return res.redirect(url.format({
        path: './',
        query: {
          error: locals.error,
        },
      }));
    }

    try {
      await request({
        method: 'POST',
        url: `${api}/api/user/mfa/confirm`,
        json: true,
        body: { token: req.body.token },
        headers: {
          Authorization: token,
        },
      });
    } catch (err) {
      if (!err.message) {
        locals.error = err;
      } else {
        locals.error = 'failed to confirm enrollment';
      }

      return res.redirect(url.format({
        path: './',
        query: {
          error: locals.error,
        },
      }));
    }

    req.session.user = null;
    req.session.hasGeneratedBackupCodes = false;

    return res.redirect('/settings/account/mfa/backup');
  });

  view.render('mfaEnroll');
};
