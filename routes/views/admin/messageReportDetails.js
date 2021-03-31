const keystone = require('keystone');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const log = require('../../../utils/logger')({ name: 'routes.messageReportDetails' });
const config = require('../../../config');
const { getMessageReportById } = require('../../../utils/reportUtils');
const { sendBan } = require('../../../utils/roomUtils');
const { banReasons } = require('../../../constants/constants');

module.exports = function messageReportDetails(req, res) {
  let token;
  const view = new keystone.View(req, res);
  const { locals } = res;


  const { reportId } = req.params;
  locals.section = `Admin | Message Report ${reportId}`;
  locals.page = 'messageReports';
  locals.user = req.user;
  locals.report = {};
  locals.banReasons = banReasons;

  view.on('init', async (next) => {
    token = await jwt.sign({ userId: String(locals.user._id) }, config.auth.jwtSecret, { expiresIn: '1h' });
    return getMessageReportById(token, reportId, (err, report) => {
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
      restrictBroadcast: Joi.boolean().truthy('on'),
      restrictJoin: Joi.boolean().truthy('on'),
    });

    const requestBody = {
      reason: req.body.reason,
      restrictBroadcast: req.body.restrictBroadcast === 'on',
      restrictJoin: req.body.restrictJoin === 'on',
    };

    log.debug({ requestBody });

    try {
      const {
        reason,
        restrictBroadcast,
        restrictJoin,
      } = await Joi.validate(requestBody, schema);

      log.debug({
        reason,
        restrictBroadcast,
        restrictJoin,
      }, 'validated');
      if (!restrictBroadcast && !restrictJoin) {
        locals.error = 'Select at least one ban type';
        return next();
      }

      const { sender } = locals.report.message;
      const user = {
        user_id: sender,
        restrictBroadcast,
        restrictJoin,
      };

      try {
        locals.success = await sendBan(token, reason, { restrictJoin, restrictBroadcast }, user);
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

  view.render('admin/messageReportDetails');
};
