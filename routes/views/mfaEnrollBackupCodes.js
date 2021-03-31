const keystone = require('keystone');
const url = require('url');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const { api } = require('../../constants/constants');
const log = require('../../utils/logger')({ name: 'settings.account.mfa.backup' });
const request = require('../../utils/request');

module.exports = function mfaEnroll(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  const { error } = req.query;
  let token;

  locals.section = 'Enroll MFA';
  locals.description = 'Secure your account by enrolling in MFA';
  locals.user = req.user;
  locals.error = error || null;

  view.on('init', async (next) => {
    if (!locals.user) {
      return res.redirect('/');
    }

    if (!locals.user.auth.totpSecret || req.session.hasGeneratedBackupCodes) {
      return res.redirect('/');
    }

    token = jwt.sign(String(req.user._id), config.auth.jwtSecret);

    try {
      const response = await request({
        method: 'GET',
        url: `${api}/api/user/mfa/backup`,
        json: true,
        headers: {
          Authorization: token,
        },
      });

      locals.codes = response.codes;
      req.session.hasGeneratedBackupCodes = true;
    } catch (err) {
      if (err.message) {
        locals.error = 'Failed to request enrollment information';
      } else {
        locals.error = err;
      }
    }

    return next();
  });

  view.render('mfaEnrollBackupCodes');
};
