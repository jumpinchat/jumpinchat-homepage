const url = require('url');
const keystone = require('keystone');
const request = require('request');
const jwt = require('jsonwebtoken');
const Pagination = require('pagination-object');
const log = require('../../../utils/logger')({ name: 'messages.inbox' });
const config = require('../../../config');
const { errors, successMessages, api } = require('../../../constants/constants');

module.exports = function messageInbox(req, res) {
  const view = new keystone.View(req, res);
  const { error, success, page = 1 } = req.query;
  const { locals } = res;
  let token;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.section = 'Messages | Inbox';
  locals.user = req.user;
  locals.page = page;
  locals.error = error || null;
  locals.success = success || null;
  locals.conversations = [];

  view.on('init', async (next) => {
    if (!locals.user) {
      return res.redirect('/');
    }

    token = jwt.sign(String(req.user._id), config.auth.jwtSecret);

    const urlParams = url.format({
      path: '/',
      query: {
        page: locals.page,
      },
    });
    return request({
      url: `${api}/api/message/${locals.user._id}${urlParams}`,
      method: 'get',
      headers: {
        Authorization: token,
      },
      json: true,
    }, (err, response, body) => {
      if (err) {
        log.error({ err }, 'error retrieving conversations');
        locals.error = errors.ERR_SRV;
        return next();
      }

      if (response.statusCode >= 400) {
        if (body.message) {
          locals.errors = body.message;
          return next();
        }

        locals.errors = errors.ERR_SRV;
        return next();
      }

      locals.conversations = body.conversations.sort((a, b) => {
        const aTime = new Date(a.latestMessage).getTime();
        const bTime = new Date(b.latestMessage).getTime();
        if (aTime < bTime) return 1;
        if (aTime > bTime) return -1;
        return 0;
      });

      if (body.count > 0) {
        locals.pagination = new Pagination({
          currentPage: Number(locals.page),
          totalItems: body.count,
          itemsPerPage: config.admin.userList.itemsPerPage,
          rangeLength: 9,
        });
      }

      return next();
    });
  });


  view.on('post', { action: 'read' }, async (next) => {
    return request({
      url: `${api}/api/message/read`,
      method: 'put',
      headers: {
        Authorization: token,
      },
      json: true,
    }, (err, response, body) => {
      if (err) {
        log.error({ err }, 'error marking as read');
        locals.error = errors.ERR_SRV;
        return res.redirect(url.format({
          path: './',
          query: {
            error: locals.error,
          },
        }));
      }

      if (response.statusCode >= 400) {
        log.error({ body });
        if (body.message) {
          locals.error = body.message;
          return res.redirect(url.format({
            path: './',
            query: {
              error: locals.error,
            },
          }));
        }

        locals.error = errors.ERR_SRV;
        return res.redirect(url.format({
          path: './',
          query: {
            error: locals.error,
          },
        }));
      }


      log.info('conversation marked read');
      locals.success = 'Conversations marked as read';

      return res.redirect(`/messages?success=${locals.success}`);
    });
  });

  view.render('messages/inbox');
};
