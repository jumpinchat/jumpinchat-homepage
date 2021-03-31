const Joi = require('joi');
const keystone = require('keystone');
const request = require('request');
const url = require('url');
const jwt = require('jsonwebtoken');
const log = require('../../utils/logger')({ name: 'routes.admin' });
const config = require('../../config');
const {
  getUserById,
  adminApplyTrophy,
} = require('../../utils/userUtils');
const { sendBan } = require('../../utils/roomUtils');
const {
  api,
  errors,
  banReasons,
} = require('../../constants/constants');

const Trophy = keystone.list('Trophy');

module.exports = function adminUserDetails(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  const { success, error } = req.query;

  let token;
  const { userId } = req.params;
  locals.section = `Admin | User ${userId}`;
  locals.page = 'users';
  locals.user = req.user;
  locals.account = {};
  locals.rawAccount = {};
  locals.banReasons = banReasons;
  locals.trophyOptions = [];
  locals.success = success || null;
  locals.error = error || null;


  view.on('init', async (next) => {
    try {
      token = await jwt.sign({ userId: String(locals.user._id) }, config.auth.jwtSecret, { expiresIn: '1h' });
    } catch (err) {
      log.fatal({ err }, 'failed to sign jwt');
      return res.status(500).send(err);
    }

    try {
      locals.trophyOptions = await Trophy.model.find({}).exec();
    } catch (err) {
      log.fatal({ err }, 'failed to fetch trophies');
      return res.status(500).send(err);
    }

    return getUserById(userId, true, (err, user) => {
      if (err) {
        log.fatal({ err }, 'error getting user');
        return res.status(500).send({ error: 'error getting user' });
      }

      if (!user) {
        log.error('user not found');
        return res.status(404).send({ error: 'user not found' });
      }

      const settings = {};

      Object.entries(user.settings).forEach(([key, value]) => {
        const newKey = key.replace(/([a-z])([A-Z])/g, '$1 $2');
        settings[newKey] = value ? 'yes' : 'no';
      });

      locals.rawAccount = user;
      locals.account = Object.assign(user, {
        settings,
        attrs: Object.assign(user.attrs, {
          join_date: new Date(user.attrs.join_date).toISOString(),
          last_active: new Date(user.attrs.last_active).toISOString(),
        }),
      });

      return next();
    });
  });

  view.on('post', { action: 'remove' }, (next) => {
    request({
      url: `${api}/api/admin/users/remove/${req.body.userid}`,
      method: 'delete',
      headers: {
        Authorization: token,
      },
    }, (err, response, body) => {
      if (err) {
        return res.status(500).send();
      }

      if (response.statusCode >= 400) {
        log.warn({ body, status: response.statusCode }, 'failed to remove user');
        if (body && body.message) {
          locals.errors = body.message;
          return next();
        }

        log.warn('failed to remove user', { body, code: response.statusCode });
        locals.errors = 'Failed to remove user';
        return next();
      }

      return res.redirect('/admin/users');
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

      const { rawAccount: target } = locals;
      const user = {
        user_id: target._id,
        ip: target.attrs.last_login_ip,
        restrictBroadcast,
        restrictJoin,
      };

      try {
        locals.success = await sendBan(token, reason, type, user, expire);
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

  view.on('post', { action: 'addtrophy' }, async () => {
    const { trophy } = req.body;

    try {
      await adminApplyTrophy(token, locals.account._id, trophy);
      locals.success = 'Trophy applied';
      return res.redirect(url.format({
        path: './',
        query: {
          success: locals.success,
        },
      }));
    } catch (err) {
      log.fatal({ err }, 'failed to apply trophy');
      locals.error = errors.ERR_SRV;
      return res.redirect(url.format({
        path: './',
        query: {
          error: locals.error,
        },
      }));
    }
  });

  view.render('adminUserDetails');
};
