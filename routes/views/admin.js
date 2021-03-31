const keystone = require('keystone');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const request = require('request');
const moment = require('moment');
const Pagination = require('pagination-object');
const log = require('../../utils/logger')({ name: 'routes.admin' });
const config = require('../../config');
const { adminGetRoomList } = require('../../utils/roomUtils');
const adminUtils = require('../../utils/adminUtils');
const {
  adminGetUsers,
  adminGetUserCount,
  searchUserByUsername,
} = require('../../utils/userUtils');

const { getReports } = require('../../utils/reportUtils');
const { getRequests } = require('../../utils/ageVerifyUtils');
const { api, errors } = require('../../constants/constants');

const pageNames = {
  PAGE_DASHBOARD: 'dashboard',
  PAGE_ROOMLIST: 'rooms',
  PAGE_USERLIST: 'users',
  PAGE_REPORTS: 'reports',
  PAGE_AGE_VERIFY: 'ageverify',
};

module.exports = function admin(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;

  let token;
  locals.page = req.params.page;
  locals.section = `Admin | ${locals.page}`;
  locals.user = req.user;
  locals.users = [];
  locals.rooms = [];
  locals.requests = [];

  locals.stats = {};
  locals.pageNumber = req.query.page || 1;

  const pages = [
    pageNames.PAGE_DASHBOARD,
    pageNames.PAGE_ROOMLIST,
    pageNames.PAGE_USERLIST,
    pageNames.PAGE_REPORTS,
    pageNames.PAGE_AGE_VERIFY,
  ];

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

    switch (locals.page) {
      case pageNames.PAGE_DASHBOARD: {
        return adminGetRoomList(token, 1, (err, body) => {
          if (err) {
            log.error({ err }, 'failed to get room list');
            return next(err);
          }

          const { rooms, count: roomCount } = body;

          log.debug({ token }, 'dashboard local token');
          locals.token = token;
          locals.rooms = rooms;
          locals.roomCount = roomCount;

          return adminGetUserCount((err, userCount) => {
            if (err) {
              log.error({ err }, 'error getting user count');
              return next(err);
            }

            locals.users = userCount;
            return next();
          });
        });
      }
      case pageNames.PAGE_ROOMLIST: {
        return adminGetRoomList(token, locals.pageNumber, (err, roomList) => {
          if (err) {
            log.error({ err }, 'failed to get room list');
            return next(err);
          }

          const { rooms, count } = roomList;


          if (count > 0) {
            locals.pagination = new Pagination({
              currentPage: Number(locals.pageNumber),
              totalItems: count,
              itemsPerPage: config.admin.userList.itemsPerPage,
              rangeLength: 9,
            });
          }

          locals.rooms = rooms;
          return next();
        });
      }
      case pageNames.PAGE_USERLIST: {
        const { search } = req.query;

        if (search) {
          return searchUserByUsername(search, true, (err, users) => {
            if (err) {
              log.fatal({ err });
              return next(err);
            }

            locals.pagination = new Pagination({
              currentPage: Number(locals.pageNumber),
              totalItems: users.length,
              itemsPerPage: config.admin.userList.itemsPerPage,
              rangeLength: 9,
            });

            locals.users = users
              .map(u => Object.assign({}, u, {
                attrs: Object.assign({}, u.attrs, {
                  join_date: moment(u.attrs.join_date).calendar(),
                }),
              }));
            return next();
          });
        }
        return adminGetUsers(token, locals.pageNumber, (err, { users, count }) => {
          if (err) {
            log.error({ err });
            return next(err);
          }

          locals.pagination = new Pagination({
            currentPage: Number(locals.pageNumber),
            totalItems: count,
            itemsPerPage: config.admin.userList.itemsPerPage,
            rangeLength: 9,
          });

          locals.users = users
            .sort((a, b) => {
              const aDate = a.attrs.join_date;
              const bDate = b.attrs.join_date;
              if (moment(aDate).isBefore(bDate)) return 1;
              if (moment(bDate).isBefore(aDate)) return -1;

              return 0;
            })
            .map(u => Object.assign({}, u, {
              attrs: Object.assign({}, u.attrs, {
                join_date: moment(u.attrs.join_date).calendar(),
              }),
            }))
            .filter(u => u.username);

          return next();
        });
      }
      case pageNames.PAGE_REPORTS: {
        return getReports(token, locals.pageNumber, (err, { reports, count }) => {
          if (err) {
            return next(err);
          }

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
            })
            .map(r => Object.assign({}, r, {
              createdAt: moment(r.createdAt).calendar(),
            }));
          return next();
        });
      }
      case pageNames.PAGE_AGE_VERIFY: {
        return getRequests(token, (err, requests) => {
          if (err) {
            return next(err);
          }

          locals.statusColors = {
            PENDING: 'sub',
            DENIED: 'red',
            APPROVED: 'green',
            REJECTED: 'yellow',
          };

          locals.requests = requests.reverse();
          return next();
        });
      }

      default:
        return res.redirect(`/admin/${pageNames.PAGE_DASHBOARD}`);
    }
  });

  view.on('post', { action: 'server-message' }, (next) => {
    const schema = Joi.object().keys({
      message: Joi.string().required(),
      type: Joi.string().required(),
    });

    const body = {
      message: req.body.message,
      type: req.body['message-type'],
    };

    Joi.validate(body, schema, { abortEarly: false }, (err, validatedLogin) => {
      if (err) {
        log.warn({ err }, 'invalid message');
        locals.errors = errors.ERR_VALIDATION;
        return next();
      }

      return request({
        method: 'POST',
        url: `${api}/api/admin/notify`,
        headers: {
          Authorization: token,
        },
        body,
        json: true,
      }, (err, response, responseBody) => {
        if (err) {
          log.error({ err }, 'error happened');
          locals.error = 'error happened';
          return next();
        }

        if (response.statusCode >= 400) {
          if (responseBody && responseBody.message) {
            locals.error = responseBody.message;
            return next();
          }

          log.error({ statusCode: response.statusCode }, 'error getting room list');
          locals.error = 'error happened';
          return next();
        }

        locals.success = 'Message sent successfully';
        return next(null, body);
      });
    });
  });

  view.on('post', { action: 'user-emails' }, (next) => {
    const schema = Joi.object().keys({
      emailMessage: Joi.string().required(),
      emailSubject: Joi.string().required(),
    });

    const body = {
      emailMessage: req.body.emailMessage,
      emailSubject: req.body.emailSubject,
    };

    Joi.validate(body, schema, { abortEarly: false }, (err, validated) => {
      if (err) {
        log.warn({ err }, 'invalid message');
        locals.errors = errors.ERR_VALIDATION;
        return next();
      }

      return request({
        method: 'POST',
        url: `${api}/api/admin/email/send`,
        headers: {
          Authorization: token,
        },
        body: {
          message: validated.emailMessage,
          subject: validated.emailSubject,
        },
        json: true,
      }, (err, response, responseBody) => {
        if (err) {
          log.error({ err }, 'error happened');
          locals.error = 'error happened';
          return next();
        }

        if (response.statusCode >= 400) {
          if (responseBody && responseBody.message) {
            locals.error = responseBody.message;
            return next();
          }

          log.error({ statusCode: response.statusCode }, 'error sending email');
          locals.error = 'error happened';
          return next();
        }

        locals.success = 'Message sent successfully';
        return res.redirect('/admin/dashboard');
      });
    });
  });

  view.on('post', { action: 'search-users' }, (next) => {
    const { search } = req.body;
    return res.redirect(`/admin/users?search=${search}`);
  });

  view.render('admin');
};
