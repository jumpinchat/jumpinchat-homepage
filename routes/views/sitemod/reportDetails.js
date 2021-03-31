const url = require('url');
const keystone = require('keystone');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const log = require('../../../utils/logger')({ name: 'routes.sitemod.reportDetails' });
const config = require('../../../config');
const { getReportById, setReportResolved } = require('../../../utils/reportUtils');
const { getUserById } = require('../../../utils/userUtils');
const { sendBan, getRoomById } = require('../../../utils/roomUtils');
const { banReasons, reportOutcomes, errors } = require('../../../constants/constants');

module.exports = function sitemodReportDetails(req, res) {
  let token;
  const view = new keystone.View(req, res);
  const { locals } = res;
  const {
    success,
    error,
  } = req.query;


  const { reportId } = req.params;
  locals.error = error || null;
  locals.success = success || null;
  locals.section = `Site Mod | Report ${reportId}`;
  locals.page = 'reports';
  locals.user = req.user;
  locals.report = {};
  locals.banReasons = banReasons;
  locals.reportOutcomes = reportOutcomes;

  view.on('init', async (next) => {
    token = await jwt.sign({ userId: String(locals.user._id) }, config.auth.jwtSecret, { expiresIn: '1h' });
    return getReportById(token, reportId, async (err, report) => {
      if (err) {
        log.fatal({ err }, 'error getting report');
        return res.status(500).send({ error: 'error getting report' });
      }

      if (!report) {
        log.error('report not found');
        return res.status(404).send({ error: 'report not found' });
      }

      locals.report = report;

      try {
        const room = await getRoomById(report.room.roomId);
        locals.report.room.isAgeRestricted = room.attrs.ageRestricted;
      } catch (err) {
        log.fatal({ err }, 'failed to get report room details');
      }
      if (report.reporter.userId) {
        try {
          const { username } = await getUserById(report.reporter.userId);
          locals.reporterUsername = username;
        } catch (err) {
          log.fatal({ err }, 'failed to fetch user');
        }
      }

      if (report.target.userId) {
        try {
          const { username } = await getUserById(report.target.userId);
          locals.targetUsername = username;
        } catch (err) {
          log.fatal({ err }, 'failed to fetch user');
        }
      }

      return next();
    });
  });

  view.on('post', { action: 'siteban' }, async (next) => {
    locals.error = null;
    const schema = Joi.object().keys({
      reason: Joi.string().required(),
      duration: Joi.number().required(),
      type: Joi.string().required(),
    });

    const requestBody = {
      reason: req.body.reason,
      duration: req.body.duration,
      type: req.body.type,
    };

    try {
      const {
        reason,
        duration,
        type,
      } = await Joi.validate(requestBody, schema);

      const expire = new Date(Date.now() + (1000 * 60 * 60 * Number(duration)));

      const { target } = locals.report;
      const user = {
        user_id: target.userId,
        session_id: target.sessionId,
        ip: target.ip,
        socket_id: target.socketId,
      };

      const banType = {
        restrictBroadcast: type === 'broadcast',
        restrictJoin: type === 'join',
      };

      try {
        locals.success = await sendBan(token, reason, banType, user, expire, reportId);
        return res.redirect(url.format({
          path: './',
          query: {
            success: locals.success,
          },
        }));
      } catch (err) {
        log.error({ err }, 'error sending ban request');
        locals.error = err;
        return res.redirect(url.format({
          path: './',
          query: {
            error: locals.error,
          },
        }));
      }
    } catch (err) {
      log.error({ err }, 'validation error');
      if (err.name === 'ValidationError') {
        locals.error = 'Invalid request, reason probably missing';
        return res.redirect(url.format({
          path: './',
          query: {
            error: locals.error,
          },
        }));
      }

      locals.error = 'Verification error';
      return res.redirect(url.format({
        path: './',
        query: {
          error: locals.error,
        },
      }));
    }
  });

  view.on('post', { action: 'resolve' }, async () => {
    try {
      await setReportResolved(token, reportId);
      return res.redirect(url.format({
        path: './',
        query: {
          success: 'Report resolved',
        },
      }));
    } catch (err) {
      locals.error = err.message || err || errors.ERR_SRV;
      return res.redirect(url.format({
        path: './',
        query: {
          error: locals.error,
        },
      }));
    }
  });

  view.render('sitemod/reportDetails');
};
