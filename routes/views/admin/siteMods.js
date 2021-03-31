const keystone = require('keystone');
const url = require('url');
const jwt = require('jsonwebtoken');
const log = require('../../../utils/logger')({ name: 'routes.admin.siteMods' });
const config = require('../../../config');
const {
  getSiteMods,
  addSiteMod,
  removeSiteMod,
} = require('../../../utils/adminUtils');

module.exports = function adminSiteMods(req, res) {
  let token;
  const view = new keystone.View(req, res);
  const { locals } = res;
  const {
    success,
    error,
  } = req.query;

  locals.section = 'Admin | Site mods';
  locals.page = 'sitemods';
  locals.user = req.user;
  locals.roomCloses = [];
  locals.error = error || null;
  locals.success = success || null;

  view.on('init', async (next) => {
    token = await jwt.sign({ userId: String(locals.user._id) }, config.auth.jwtSecret, { expiresIn: '1h' });

    try {
      locals.siteMods = await getSiteMods(token);
    } catch (err) {
      log.fatal({ err }, 'failed to fetch site mods');
      return res.status(500).send();
    }

    return next();
  });

  view.on('post', { action: 'add-mod' }, async () => {
    const { username } = req.body;
    try {
      await addSiteMod(token, username);
      return res.redirect(url.format({
        path: './',
        query: {
          success: 'site mod added',
        },
      }));
    } catch (err) {
      log.fatal({ err }, 'failed to add site mod');
      locals.error = err;

      return res.redirect(url.format({
        path: './',
        query: {
          error: locals.error,
        },
      }));
    }
  });

  view.on('post', { action: 'remove-mod' }, async () => {
    const { modId } = req.body;
    log.debug({ modId }, 'remove-mod');
    try {
      await removeSiteMod(token, modId);
      return res.redirect(url.format({
        path: './',
        query: {
          success: 'site mod removed',
        },
      }));
    } catch (err) {
      log.fatal({ err }, 'failed to remove site mod');
      locals.error = err;

      return res.redirect(url.format({
        path: './',
        query: {
          error: locals.error,
        },
      }));
    }
  });

  view.render('admin/siteMods');
};
