const keystone = require('keystone');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const Pagination = require('pagination-object');
const log = require('../../../utils/logger')({ name: 'routes.sitemod.reportList' });
const config = require('../../../config');

const { getReports } = require('../../../utils/reportUtils');

module.exports = function admin(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;

  let token;
  locals.page = 'reports';
  locals.section = 'Sitemod | Report list';
  locals.user = req.user;
  locals.users = [];
  locals.rooms = [];
  locals.requests = [];

  locals.stats = {};
  locals.pageNumber = req.query.page || 1;

  view.on('init', async (next) => {
    if (!locals.user) {
      log.warn('no user');
      return res.redirect('/');
    }

    if (locals.user.attrs.userLevel < 20) {
      log.warn({
        userId: locals.user._id,
        userLevel: locals.user.attrs.userLevel,
      }, 'user is not an admin');

      return res.redirect('/');
    }

    try {
      token = await jwt.sign({ userId: String(locals.user._id) }, config.auth.jwtSecret, { expiresIn: '1h' });
    } catch (err) {
      log.fatal({ err }, 'failed to create token');
      return res.status(500).send(err);
    }

    return getReports(token, locals.pageNumber, (err, body) => {
      if (err) {
        return next(err);
      }

      const { reports, count } = body;

      if (count > 0) {
        locals.pagination = new Pagination({
          currentPage: Number(locals.pageNumber),
          totalItems: count,
          itemsPerPage: config.admin.userList.itemsPerPage,
          rangeLength: 9,
        });
      }


      locals.reports = reports
        .sort((a, b) => {
          const aDate = moment(a.createdAt);
          const bDate = moment(b.createdAt);
          if (aDate.isBefore(bDate)) return 1;
          if (bDate.isBefore(aDate)) return -1;

          return 0;
        });
      return next();
    });
  });

  view.render('sitemod/reportList');
};
