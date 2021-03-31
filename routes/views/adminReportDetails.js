const url = require('url');
const keystone = require('keystone');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const log = require('../../utils/logger')({ name: 'routes.adminReportDetails' });
const config = require('../../config');
const { getReportById, setReportResolved } = require('../../utils/reportUtils');
const {
  sendBan,
} = require('../../utils/roomUtils');
const {
  banReasons,
  reportOutcomes,
  errors,
} = require('../../constants/constants');

module.exports = function adminReportDetails(req, res) {
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
  locals.section = `Admin | Report ${reportId}`;
  locals.page = 'reports';
  locals.user = req.user;
  locals.report = {};
  locals.banReasons = banReasons;
  locals.reportOutcomes = reportOutcomes;

  view.on('init', async (next) => {
    token = await jwt.sign({ userId: String(locals.user._id) }, config.auth.jwtSecret, { expiresIn: '1h' });
    return getReportById(token, reportId, (err, report) => {
      if (err) {
        log.fatal({ err }, 'error getting report');
        return res.status(500).send({ error: 'error getting report' });
      }

      if (!report) {
        log.error('report not found');
        return res.status(404).send({ error: 'report not found' });
      }

      locals.report = report;
      return next();
    });
  });

  view.on('post', { action: 'siteban' }, async (next) => {
    log.debug({ body: req.body });
    locals.error = null;
    const schema = Joi.object().keys({
      reason: Joi.string().required(),
      duration: Joi.number().required(),
      restrictBroadcast: Joi.boolean().truthy('on'),
      restrictJoin: Joi.boolean().truthy('on'),
    });

    const requestBody = {
      reason: req.body.reason,
      duration: req.body.duration,
      restrictBroadcast: req.body.restrictBroadcast === 'on',
      restrictJoin: req.body.restrictJoin === 'on',
    };

    try {
      const {
        reason,
        duration,
        restrictBroadcast,
        restrictJoin,
      } = await Joi.validate(requestBody, schema);

      if (!restrictBroadcast && !restrictJoin) {
        locals.error = 'Select at least one ban type';
        return next();
      }

      const expire = new Date(Date.now() + (1000 * 60 * 60 * Number(duration)));

      const { target } = locals.report;
      const user = {
        user_id: target.userId,
        session_id: target.sessionId,
        ip: target.ip,
        restrictBroadcast,
        restrictJoin,
        socket_id: target.socketId,
      };

      const type = { restrictJoin, restrictBroadcast };
      try {
        locals.success = await sendBan(token, reason, type, user, expire, reportId);
        return next();
      } catch (err) {
        log.error({ err }, 'error sending ban request');
        locals.error = err;
        return next();
      }
    } catch (err) {
      log.error({ err }, 'validation error');
      if (err.name === 'ValidationError') {
        locals.error = 'Invalid request, reason probably missing';
      } else {
        locals.error = 'Verification error';
      }

      return next();
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

  view.render('adminReportDetails');
};
