/**
 * Created by Zaccary on 19/03/2017.
 */

const Joi = require('joi');
const log = require('../../utils/logger')({ name: 'user.create' });
const keystone = require('keystone');
const request = require('request');
const url = require('url');
const { errors, api } = require('../../constants/constants');
const { getRemoteIpFromReq } = require('../../utils/userUtils');
const config = require('../../config');

module.exports = function register(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  const { error } = req.query;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.section = 'Create an account';
  locals.description = 'Create an account and reserve your chat room. It\'s quick and easy and allows you to start your own customisable room instantly';
  locals.user = req.user;
  locals.error = error || null;

  view.on('init', (next) => {
    if (locals.user && req.signedCookies['jic.ident']) {
      return res.redirect('/');
    }

    log.debug({ errors: locals.error }, 'errors');
    return next();
  });

  view.on('post', { action: 'register' }, () => {
    const schema = Joi.object().keys({
      username: Joi.string().alphanum().max(32).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      settings: Joi.object().keys({
        receiveUpdates: Joi.boolean().required(),
      }).required(),
      phone6tY4bPYk: Joi.any().valid('').strip(),
    });

    const user = {
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      settings: {
        receiveUpdates: !!req.body.receiveUpdates,
      },
      phone6tY4bPYk: req.body.phone6tY4bPYk,
    };

    Joi.validate(user, schema, { abortEarly: false }, (err, validatedUser) => {
      if (err) {
        if (err.name === 'ValidationError') {
          locals.error = err.details.map(e => e.message).join('\n');
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

      const username = validatedUser.username.toLowerCase();
      const ip = getRemoteIpFromReq(req);
      const { fingerprint } = req.session;

      log.debug({ username, ip }, 'register user');

      request({
        method: 'POST',
        url: `${api}/api/user/register`,
        json: true,
        body: {
          username,
          password: validatedUser.password,
          email: validatedUser.email,
          settings: validatedUser.settings,
          ip,
          fingerprint,
        },
      }, (err, response, body) => {
        if (err) {
          log.error({ err }, 'error happened');
          return res.status(500).send();
        }

        if (response.statusCode >= 400) {
          if (body.message) {
            log.error({ body }, 'registration error');
            locals.error = errors[body.message] || body.message;
            return res.redirect(url.format({
              path: './',
              query: {
                error: locals.error,
              },
            }));
          }

          locals.error = 'Registration failed';
          return res.redirect(url.format({
            path: './',
            query: {
              error: locals.error,
            },
          }));
        }

        const { user: receivedUser } = body.data;

        request({
          url: `${api}/api/user/verify/email`,
          method: 'post',
          body: { user: receivedUser },
          json: true,
        }, (err, response, body) => {
          if (err) {
            log.fatal({ err }, 'verification request failed');
            return;
          }

          if (response.statusCode >= 400) {
            if (body) {
              log.error({
                response: response.statusCode,
                message: body.message,
              }, 'failed to send email confirmation email');
            } else {
              log.error({
                response: response.statusCode,
              }, 'failed to send email confirmation email');
            }

            return;
          }

          log.debug('verification email sent');
        });

        res.cookie('jic.ident', receivedUser._id, {
          maxAge: config.auth.cookieTimeout,
          signed: true,
          httpOnly: true,
        });

        res.redirect(`/${user.username}`);
      });
    });
  });

  view.render('register');
};
