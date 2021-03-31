const keystone = require('keystone');
const request = require('request');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const log = require('../../utils/logger')({ name: 'routes.adminRoomDetails' });
const config = require('../../config');
const {
  getRequestById,
  updateRequest,
} = require('../../utils/ageVerifyUtils');
const {
  getRoomById,
  sendBan,
} = require('../../utils/roomUtils');
const {
  api,
  errors,
  ageVerifyRejectReasons,
} = require('../../constants/constants');

const statuses = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  DENIED: 'DENIED',
  EXPIRED: 'EXPIRED',
};

module.exports = function adminAgeVerificationDetails(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;


  const { requestId } = req.params;
  locals.section = `Admin | Age verification ${requestId}`;
  locals.user = req.user;
  locals.request = {};
  locals.rejectReasons = ageVerifyRejectReasons;

  view.on('init', async (next) => {
    token = await jwt.sign({ userId: String(locals.user._id) }, config.auth.jwtSecret, { expiresIn: '1h' });
    return getRequestById(token, requestId, (err, request) => {
      if (err) {
        log.fatal({ err }, 'error getting request');
        return res.status(500).send({ error: 'error getting request' });
      }

      if (!request) {
        log.error('Request not found');
        return res.status(404).send({ error: 'request not found' });
      }

      locals.request = request;
      return next();
    });
  });

  view.on('post', { action: 'approve' }, async (next) => {
    try {
      locals.success = await updateRequest(token, requestId, statuses.APPROVED);
      return next();
    } catch (err) {
      log.error({ err }, 'error updating request');
      locals.error = err;
      return next();
    }
  });

  view.on('post', { action: 'reject' }, async (next) => {
    const { rejectReason } = req.body;

    try {
      locals.success = await updateRequest(token, requestId, statuses.REJECTED, rejectReason);
      return next();
    } catch (err) {
      log.error({ err }, 'error updating request');
      locals.error = err;
      return next();
    }
  });

  view.on('post', { action: 'deny' }, async (next) => {
    try {
      locals.success = await updateRequest(token, requestId, statuses.DENIED);
      return next();
    } catch (err) {
      log.error({ err }, 'error updating request');
      locals.error = err;
      return next();
    }
  });

  view.render('adminAgeVerificationDetails');
};
