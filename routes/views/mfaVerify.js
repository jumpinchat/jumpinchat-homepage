const keystone = require('keystone');
const url = require('url');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const { api } = require('../../constants/constants');
const request = require('../../utils/request');
const log = require('../../utils/logger')({ name: 'login.mfa' });

module.exports = function login(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  const { user } = req.session;
  let token;

  locals.section = 'Validate login';
  locals.description = 'Validate login';
  locals.error = req.query.error || null;

  view.on('init', (next) => {
    log.debug({
      user: locals.user ? locals.user.username : null,
      session: req.session,
    });
    if (!user) {
      return res.redirect('/login');
    }


    token = jwt.sign(String(user), config.auth.jwtSecret);


    return next();
  });

  view.on('post', { action: 'verify' }, async () => {
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
        url: `${api}/api/user/mfa/verify`,
        json: true,
        body: {
          token: req.body.token,
        },
        headers: {
          Authorization: token,
        },
      });
    } catch (err) {
      if (err.message) {
        locals.error = 'Verification failed';
      } else {
        locals.error = err;
      }

      return res.redirect(url.format({
        path: './',
        query: {
          error: locals.error,
        },
      }));
    }

    res.cookie('jic.ident', user, {
      maxAge: config.auth.cookieTimeout,
      signed: true,
      httpOnly: true,
    });

    return res.redirect('/');
  });

  view.render('mfaVerify');
};
