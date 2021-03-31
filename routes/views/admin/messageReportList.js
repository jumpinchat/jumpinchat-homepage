const keystone = require('keystone');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const Pagination = require('pagination-object');
const log = require('../../../utils/logger')({ name: 'routes.admin' });
const config = require('../../../config');
const { getMessageReports } = require('../../../utils/reportUtils');

module.exports = function messageReportList(req, res) {
  const view = new keystone.View(req, res);
  const { page = 1 } = req.query;
  const { locals } = res;

  locals.section = `Admin | ${locals.page}`;
  locals.user = req.user;
  locals.page = page;

  let token;

  view.on('init', async (next) => {
    if (!locals.user) {
      log.warn('no user');
      return res.redirect('/');
    }

    if (locals.user.attrs.userLevel < 30) {
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

    return getMessageReports(token, locals.page, (err, { reports, count }) => {
      if (err) {
        return next(err);
      }

      if (count > 0) {
        locals.pagination = new Pagination({
          currentPage: Number(locals.page),
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
        })
        .map(r => Object.assign({}, r, {
          createdAt: moment(r.createdAt).calendar(),
        }));

      return next();
    });
  });

  view.render('admin/messageReportList');
};
