const keystone = require('keystone');
const request = require('request');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const log = require('../../utils/logger')({ name: 'routes.adminBanList' });
const config = require('../../config');

const Banlist = keystone.list('Banlist');
const {
  api,
  errors,
  banReasons,
} = require('../../constants/constants');

module.exports = function adminBanList(req, res) {
  let token;
  const view = new keystone.View(req, res);
  const { locals } = res;

  const roomName = req.params.room;
  const { userListId } = req.params;

  locals.section = 'Admin | Banlist';
  locals.page = 'banlist';
  locals.user = req.user;
  locals.banlist = [];

  view.on('init', async (next) => {
    token = await jwt.sign({ userId: String(locals.user._id) }, config.auth.jwtSecret, { expiresIn: '1h' });
    const banlist = await Banlist.model
      .find({})
      .lean()
      .sort('-createdAt');
    locals.banlist = banlist.map(item => Object.assign(item, {
      ip: !!item.ip && item.ip.replace(/\d{1,3}\.\d{1,3}$/, '0.0'),
    }));

    log.debug({ userIds: locals.banlist.map(b => b.userId) })

    return next();
  });

  view.render('adminBanList');
};
