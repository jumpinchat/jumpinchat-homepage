const keystone = require('keystone');
const jwt = require('jsonwebtoken');
const log = require('../../utils/logger')({ name: 'routes.adminBanDetails' });
const config = require('../../config');
const { getBanItem } = require('../../utils/adminUtils');
const {
  errors,
  banReasons,
} = require('../../constants/constants');

module.exports = function adminBanDetails(req, res) {
  let token;
  const view = new keystone.View(req, res);
  const { locals } = res;


  const { banId } = req.params;
  locals.section = `Admin | ban ${banId}`;
  locals.page = 'banlist';
  locals.user = req.user;
  locals.report = {};

  view.on('init', async (next) => {
    try {
      token = await jwt.sign({ userId: String(locals.user._id) }, config.auth.jwtSecret, { expiresIn: '1h' });
    } catch (err) {
      log.error({ err }, 'error signing token');
      return res.status(401).send();
    }

    try {
      locals.ban = await getBanItem(token, banId);
    } catch (err) {
      log.fatal({ err }, 'error finding banlist item');
      return res.status(500).end();
    }

    locals.ban = {
      ...locals.ban,
      reason: banReasons[locals.ban.reason],
    };
    return next();
  });

  view.render('adminBanDetails');
};
