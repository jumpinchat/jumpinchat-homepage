const keystone = require('keystone');
const url = require('url');
const jwt = require('jsonwebtoken');
const Pagination = require('pagination-object');
const log = require('../../../utils/logger')({ name: 'routes.adminRoomCloseList' });
const config = require('../../../config');
const {
  getModActivity,
} = require('../../../utils/adminUtils');

module.exports = function adminSiteMods(req, res) {
  let token;
  const view = new keystone.View(req, res);
  const { locals } = res;
  const {
    success,
    error,
    page,
  } = req.query;

  locals.section = 'Admin | Site mods | Activity';
  locals.page = 'sitemods';
  locals.user = req.user;
  locals.roomCloses = [];
  locals.error = error || null;
  locals.success = success || null;
  locals.pageNumber = page || 1;

  view.on('init', async (next) => {
    token = await jwt.sign({ userId: String(locals.user._id) }, config.auth.jwtSecret, { expiresIn: '1h' });

    try {
      locals.activity = await getModActivity(token, locals.pageNumber);
    } catch (err) {
      log.fatal({ err }, 'failed to fetch site mods');
      return res.status(500).send();
    }

    if (locals.activity.count > 0) {
      locals.pagination = new Pagination({
        currentPage: Number(locals.pageNumber),
        totalItems: locals.activity.count,
        itemsPerPage: config.admin.userList.itemsPerPage,
        rangeLength: 9,
      });
    }

    return next();
  });

  view.render('admin/modActivity');
};
