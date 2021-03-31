const request = require('request');
const jwt = require('jsonwebtoken');
const log = require('../utils/logger')({ name: 'messageUtils' });
const { errors, api } = require('../constants/constants');
const config = require('../config');

module.exports.getConversation = function getConversation(userId, recipientId, token, page, cache = 1) {
  return new Promise((resolve, reject) => request({
    url: `${api}/api/message/${userId}/${recipientId}?page=${page}&cache=${cache}`,
    method: 'get',
    headers: {
      Authorization: token,
    },
    json: true,
  }, (err, response, body) => {
    if (err) {
      log.error({ err }, 'error retrieving conversations');
      return reject(err);
    }

    if (response.statusCode >= 400) {
      if (body && body.message) {
        log.error({ message: body.message });
        const error = new Error('RequestError');
        error.message = body.message;
        return reject(error);
      }

      log.error({ statusCode: response.statusCode }, 'failed to get conversation');
      const error = new Error('ServerError');
      error.message = errors.ERR_SRV;
      return reject(error);
    }

    return resolve(body);
  }));
};

module.exports.getUnreadMessages = function getUnreadMessages(userId) {
  const token = jwt.sign(String(userId), config.auth.jwtSecret);
  return new Promise((resolve, reject) => request({
    url: `${api}/api/message/${userId}/unread`,
    method: 'get',
    headers: {
      Authorization: token,
    },
    json: true,
  }, (err, response, body) => {
    if (err) {
      log.error({ err }, 'error retrieving unread conversations');
      return reject(err);
    }

    if (response.statusCode >= 400) {
      if (body && body.message) {
        log.error({ message: body.message });
        const error = new Error('RequestError');
        error.message = body.message;
        return reject(error);
      }

      log.error({ statusCode: response.statusCode }, 'failed to get conversation');
      const error = new Error('ServerError');
      error.message = errors.ERR_SRV;
      return reject(error);
    }

    return resolve(body);
  }));
};

module.exports.markMessagesRead = function markMessagesRead(userId, participantId, token) {
  return new Promise((resolve, reject) => request({
    url: `${api}/api/message/read/${userId}/${participantId}`,
    method: 'put',
    headers: {
      Authorization: token,
    },
    json: true,
  }, (err, response, body) => {
    if (err) {
      log.error({ err }, 'error setting messages read');
      return reject(err);
    }

    if (response.statusCode >= 400) {
      if (body && body.message) {
        log.error({ message: body.message });
        const error = new Error('RequestError');
        error.message = body.message;
        return reject(error);
      }

      log.error({ statusCode: response.statusCode }, 'error setting messages read');
      const error = new Error('ServerError');
      error.message = errors.ERR_SRV;
      return reject(error);
    }

    return resolve(body);
  }));
};
