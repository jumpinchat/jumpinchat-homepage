const url = require('url');
const keystone = require('keystone');
const request = require('request');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const marked = require('marked');
const log = require('../../../utils/logger')({ name: 'messages.compose' });
const config = require('../../../config');
const { getUserByUsername } = require('../../../utils/userUtils');
const { getConversation, markMessagesRead } = require('../../../utils/messageUtils');
const {
  errors,
  successMessages,
  api,
  messageReportReasons,
} = require('../../../constants/constants');

module.exports = function messageInbox(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  const { recipient } = req.params;
  const {
    success,
    error,
    page = 1,
    report,
  } = req.query;
  let token;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.section = 'Messages | Inbox';
  locals.user = req.user;
  locals.error = error || null;
  locals.success = success || null;
  locals.recipient = null;
  locals.userIgnored = false;
  locals.page = page;
  locals.messageReportReasons = messageReportReasons;
  locals.report = report;

  view.on('init', async (next) => {
    if (!locals.user) {
      return res.redirect('/');
    }

    token = jwt.sign(String(req.user._id), config.auth.jwtSecret);

    const cache = locals.success ? 0 : 1;

    try {
      const user = await getUserByUsername(recipient);
      if (!user) {
        log.warn('no user found');
        return res.redirect('/messages');
      }

      const conversation = await getConversation(String(req.user._id), user.id, token, page, cache);
      await markMessagesRead(String(req.user._id), user.id, token);


      locals.recipient = user;
      locals.conversation = {
        ...conversation,
        messages: conversation.messages.map(m => ({
          ...m,
          message: m.message && marked(m.message),
        })),
      };

      locals.userIgnored = locals.user.settings.ignoreList
        .some(u => String(u.userId) === String(locals.recipient._id));

      return next();
    } catch (err) {
      log.fatal({ err }, 'failed to get recipient user');
      return res.status(500).end();
    }
  });

  view.on('post', { action: 'send' }, async (next) => {
    const schema = Joi.object().keys({
      message: Joi.string().required(),
    });

    try {
      const {
        message,
      } = await Joi.validate({
        message: req.body.message,
      }, schema);

      return request({
        url: `${api}/api/message/${locals.recipient._id}`,
        method: 'post',
        headers: {
          Authorization: token,
        },
        body: {
          message,
        },
        json: true,
      }, (err, response, body) => {
        if (err) {
          log.error({ err }, 'error retrieving conversations');
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

        const newMessage = {
          ...body,
          message: body.message ? marked(body.message) : '',
        };
        locals.conversation = {
          ...locals.conversation,
          messages: [
            newMessage,
            ...locals.conversation.messages,
          ],
        };

        locals.success = 'Message sent';

        return res.redirect(url.format({
          path: './',
          query: {
            success: locals.success,
          },
        }));
      });
    } catch (err) {
      locals.error = errors.ERR_VALIDATION;
      return res.redirect(url.format({
        path: './',
        query: {
          error: locals.error,
        },
      }));
    }
  });

  view.on('post', { action: 'ignore' }, async (next) => {
    if (locals.userIgnored) {
      locals.user.settings.ignoreList = locals.user.settings.ignoreList
        .filter(u => String(u.userId) !== String(locals.recipient._id));
    } else {
      locals.user.settings.ignoreList = [
        ...locals.user.settings.ignoreList,
        {
          handle: locals.recipient.username,
          timestamp: Date.now(),
          userId: locals.recipient._id,
        },
      ];
    }

    locals.user.save((err, savedUser) => {
      if (err) {
        log.fatal({ err }, 'error saving room');
        return res.status(500).send();
      }

      locals.user = savedUser;
      locals.success = 'User settings saved';
      return res.redirect(url.format({
        path: './',
        query: {
          success: locals.success,
        },
      }));
    });
  });

  view.on('post', { action: 'report' }, async (next) => {
    const schema = Joi.object().keys({
      reason: Joi.string().required(),
      message: Joi.string().required(),
    });

    try {
      const {
        reason,
        message,
      } = await Joi.validate({
        reason: req.body.reason,
        message: report,
      }, schema);

      return request({
        url: `${api}/api/report/message`,
        method: 'post',
        headers: {
          Authorization: token,
        },
        body: {
          messageId: message,
          reason,
        },
        json: true,
      }, (err, response, body) => {
        if (err) {
          log.error({ err }, 'error posting report');
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


        locals.success = 'Report sent';

        return res.redirect(url.format({
          path: './',
          query: {
            success: locals.success,
          },
        }));
      });
    } catch (err) {
      locals.error = errors.ERR_VALIDATION;
      return res.redirect(url.format({
        path: './',
        query: {
          error: locals.error,
        },
      }));
    }
  });

  view.on('post', { action: 'archive' }, async (next) => {
    return request({
      url: `${api}/api/message/archive/${locals.user._id}/${locals.conversation.participant._id}`,
      method: 'put',
      headers: {
        Authorization: token,
      },
      json: true,
    }, (err, response, body) => {
      if (err) {
        log.error({ err }, 'error archiving conversation');
        locals.error = errors.ERR_SRV;
        return res.redirect(url.format({
          path: './',
          query: {
            error: locals.error,
          },
        }));
      }

      if (response.statusCode >= 400) {
        log.error({ body }, 'error archiving conversation');
        if (body && body.message) {
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


      log.info('conversation archived');
      locals.success = 'Conversation archived';

      return res.redirect(`/messages?success=${locals.success}`);
    });
  });

  view.render('messages/compose');
};
