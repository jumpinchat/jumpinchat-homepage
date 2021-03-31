const keystone = require('keystone');
const url = require('url');
const bcrypt = require('bcrypt');
const request = require('request');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const log = require('../../../utils/logger')({ name: 'settings.account' });
const { errors, successMessages, api } = require('../../../constants/constants');
const requestPromise = require('../../../utils/request');
const config = require('../../../config');
const {
  generatePassHash,
} = require('../../../utils/userUtils');

const User = keystone.list('User');

function getSubscription(userId) {
  const token = jwt.sign(String(userId), config.auth.jwtSecret);
  return new Promise((resolve, reject) => request({
    url: `${api}/api/payment/subscribed/${userId}`,
    method: 'get',
    headers: {
      Authorization: token,
    },
    json: true,
  }, (err, response, body) => {
    if (err) {
      log.error({ err }, 'error changing user email');
      return reject(err);
    }

    if (response.statusCode === 404) {
      return resolve();
    }

    if (response.statusCode >= 400) {
      log.error({ statusCode: response.statusCode }, 'error fetching subscription');
      if (body && body.message) {
        return reject(body.message);
      }

      return reject(errors.ERR_SRV);
    }

    return resolve(body);
  }));
}

module.exports = function accountSettings(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  let token;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.page = 'account';
  locals.section = 'Settings | Account';
  locals.user = req.user;
  locals.room = null;
  locals.error = req.query.error || null;
  locals.success = req.query.success || null;
  locals.brandMap = {
    MasterCard: 'mastercard',
    Visa: 'visa',
  };
  locals.supportExpires = null;

  view.on('init', async (next) => {
    if (!locals.user) {
      return res.redirect('/');
    }

    token = jwt.sign(String(req.user._id), config.auth.jwtSecret);
    const { supportExpires } = locals.user.attrs;
    if (supportExpires && moment(supportExpires).isAfter(moment())) {
      locals.supportExpires = moment(supportExpires).format();
    }

    try {
      locals.subscription = await getSubscription(locals.user._id);
      log.debug({ subscription: locals.subscription });
    } catch (err) {
      log.fatal({ err }, 'error fetching subscription');
      // return res.status(500).end();
      locals.error = 'Error fetching subscription';
    }

    return next();
  });

  view.on('post', { action: 'account' }, (next) => {
    const schema = Joi.object().keys({
      passwordNew: Joi.string().required(),
      passwordNewConfirm: Joi.string().required(),
      passwordCurrent: Joi.string().required(),
    });

    Joi.validate({
      passwordNew: req.body.passwordNew,
      passwordNewConfirm: req.body.passwordNewConfirm,
      passwordCurrent: req.body.passwordCurrent,
    }, schema, { abortEarly: false }, (err, validatedLogin) => {
      if (err) {
        log.warn({ err }, 'invalid login details');
        locals.error = errors.ERR_VALIDATION;
        return next();
      }

      return bcrypt.compare(validatedLogin.passwordCurrent, locals.user.auth.passhash,
        (passCompareErr, doesMatch) => {
          if (passCompareErr) {
            log.fatal({ err: passCompareErr }, 'failed to compare passhashes');
            locals.error = errors.ERR_SRV;
            return next();
          }

          if (!doesMatch) {
            locals.error = errors.ERR_PASS_INVALID;
            return next();
          }

          if (validatedLogin.passwordNew !== validatedLogin.passwordNewConfirm) {
            locals.error = errors.ERR_PASS_NO_MATCH;
            return next();
          }

          return User.model.findOne({ _id: locals.user._id }, (userFindErr, user) => {
            if (userFindErr) {
              log.fatal({ err: userFindErr }, 'failed to find user');
              locals.error = errors.ERR_SRV;
              return next();
            }

            return generatePassHash(validatedLogin.passwordNew, (genPassErr, newPassHash) => {
              if (genPassErr) {
                log.fatal({ err: genPassErr }, 'failed to generate password hash');
                locals.error = errors.ERR_SRV;
                return next();
              }

              user.auth.passhash = newPassHash;

              return user.save((userSaveErr) => {
                if (userSaveErr) {
                  log.fatal({ err: userSaveErr }, 'failed to save user');
                  locals.error = errors.ERR_SRV;
                  return next();
                }

                locals.success = successMessages.MSG_SETTINGS_UPDATED;
                return next();
              });
            });
          });
        });
    });
  });

  view.on('post', { action: 'email' }, (next) => {
    const schema = Joi.object().keys({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    });

    Joi.validate({
      email: req.body.email,
      password: req.body.passwordEmail,
    }, schema, { abortEarly: false }, (err, validated) => {
      if (err) {
        log.warn({ err }, 'invalid email change details');
        locals.error = errors.ERR_VALIDATION;
        return next();
      }
      request({
        url: `${api}/api/user/${locals.user._id}/changeEmail`,
        method: 'put',
        headers: {
          Authorization: token,
        },
        body: validated,
        json: true,
      }, (err, response, body) => {
        if (err) {
          log.error({ err }, 'error changing user email');
          locals.error = errors.ERR_SRV;
          return next();
        }

        if (response.statusCode >= 400) {
          if (body.message) {
            locals.error = body.message;
            return next();
          }

          locals.error = errors.ERR_SRV;
          return next();
        }

        locals.success = successMessages.MSG_SETTINGS_UPDATED;
        return next();
      });
    });
  });

  view.on('post', { action: 'removeSubscription' }, (next) => {
    request({
      url: `${api}/api/payment/subscription/${locals.user._id}`,
      method: 'delete',
      headers: {
        Authorization: token,
      },
    }, (err, response, body) => {
      if (err) {
        return res.status(500).send();
      }

      if (response.statusCode >= 400) {
        log.warn({ body, status: response.statusCode }, 'failed to remove subscription');
        if (body && body.message) {
          locals.error = body.message;
          return next();
        }

        log.warn('failed to remove subscription', { body, code: response.statusCode });
        locals.error = 'Failed to cancel subscription';
        return next();
      }

      locals.subscription = null;
      locals.success = 'Cancelled subscription, thanks for supporting JumpInChat!';
      return next();
    });
  });

  view.on('post', { action: 'updatePayment' }, (next) => {
    locals.error = null;
    request({
      url: `${api}/api/payment/source/update/${locals.user._id}`,
      method: 'put',
      body: req.body,
      headers: {
        Authorization: token,
      },
      json: true,
    }, (err, response, body) => {
      if (err) {
        log.fatal({ err }, 'failed to update payment source');
        return res.status(500).send();
      }

      if (response.statusCode >= 400) {
        log.warn({ body, status: response.statusCode }, 'failed to update payment method');
        if (body && body.message) {
          locals.error = body.message;
          return next();
        }

        log.warn('failed to update payment method', { body, code: response.statusCode });
        locals.error = 'Failed to update payment method';
        return next();
      }

      locals.subscription = null;
      locals.success = 'Payment method succesfully updated';
      return next();
    });
  });

  view.on('post', { action: 'removeuser' }, async (next) => {
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

    return request({
      url: `${api}/api/user/${locals.user._id}/remove`,
      method: 'delete',
      headers: {
        Authorization: token,
      },
    }, (err, response, body) => {
      if (err) {
        log.fatal({ err }, 'error calling remove user endpoint');
        return res.status(500).send();
      }

      if (response.statusCode >= 400) {
        log.warn({ body, status: response.statusCode }, 'failed to remove user');
        if (body && body.message) {
          locals.error = body.message;
          return next();
        }

        log.warn('failed to remove user', { body, code: response.statusCode });
        locals.error = 'Failed to remove user';
        return next();
      }

      return res.redirect('/');
    });
  });

  view.on('post', { action: 'disableTotp' }, async () => {
    try {
      await requestPromise({
        url: `${api}/api/user/mfa/disable`,
        method: 'put',
        headers: {
          Authorization: token,
        },
      });

      locals.success = 'Mfa disabled';

      return res.redirect(url.format({
        path: './',
        query: {
          success: locals.success,
        },
      }));
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
  });

  view.render('settings/account');
};
