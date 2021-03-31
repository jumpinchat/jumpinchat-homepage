/**
 * Created by Zaccary on 19/03/2017.
 */

const keystone = require('keystone');
const Joi = require('joi');
const request = require('request');
const log = require('../../utils/logger')({ name: 'login view' });
const { errors, api } = require('../../constants/constants');
const config = require('../../config');

module.exports = function login(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.section = 'Log into your account';
  locals.description = 'Already have an account? Log in using your username';
  locals.user = req.user;
  locals.errors = null;

  view.on('init', (next) => {
    if (locals.user) {
      return res.redirect('/');
    }

    return next();
  });

  view.on('post', { action: 'login' }, (next) => {
    const schema = Joi.object().keys({
      username: Joi.string().required(),
      password: Joi.string().required(),
    });

    Joi.validate({
      username: req.body.username,
      password: req.body.password,
    }, schema, { abortEarly: false }, (err, validatedLogin) => {
      if (err) {
        log.warn('invalid login details');
        locals.errors = errors.ERR_VALIDATION;
        return next();
      }

      return request({
        method: 'POST',
        url: `${api}/api/user/login`,
        json: true,
        body: {
          username: validatedLogin.username.toLowerCase(),
          password: validatedLogin.password,
        },
      }, (err, response, body) => {
        if (err) {
          log.error({ err }, 'error happened');
          return res.status(500).send();
        }

        if (response.statusCode >= 400) {
          if (body.message) {
            locals.errors = errors[body.message];
            return next();
          }

          locals.errors = 'Login failed';
          return next();
        }

        const { user } = body.data;

        if (user.auth.totpSecret) {
          req.session.user = String(user._id);
          return res.redirect('/login/totp');
        }

        res.cookie('jic.ident', user._id, {
          maxAge: config.auth.cookieTimeout,
          signed: true,
          httpOnly: true,
        });

        return res.redirect('/');
      });
    });
  });

  view.render('login');
};
