const request = require('request');
const log = require('./logger')({ name: 'utils.ageVerifyUtils' });
const { api } = require('../constants/constants');

module.exports.getRequests = function getRequests(token, cb) {
  return request({
    method: 'GET',
    url: `${api}/api/ageverify`,
    headers: {
      Authorization: token,
    },
    json: true,
  }, (err, response, body) => {
    if (err) {
      log.fatal({ err }, 'error happened');
      return cb(err);
    }

    if (response.statusCode >= 400) {
      if (body && body.message) {
        return cb(body.message);
      }

      log.error({ statusCode: response.statusCode }, 'error getting report');
      return cb('error');
    }

    return cb(null, body);
  });
};

module.exports.getRequestById = function getRequestById(token, id, cb) {
  return request({
    method: 'GET',
    url: `${api}/api/ageverify/${id}`,
    headers: {
      Authorization: token,
    },
    json: true,
  }, (err, response, body) => {
    if (err) {
      log.fatal({ err }, 'error happened');
      return cb(err);
    }

    if (response.statusCode >= 400) {
      if (body && body.message) {
        return cb(body.message);
      }

      log.error({ statusCode: response.statusCode }, 'error getting report');
      return cb('error');
    }

    return cb(null, body);
  });
};

module.exports.updateRequest = function updateRequest(token, requestId, status, reason = null) {
  return new Promise((resolve, reject) => {
    const body = {};

    if (reason) {
      body.reason = reason;
    }

    return request({
      method: 'PUT',
      url: `${api}/api/ageverify/${requestId}?status=${status}`,
      headers: {
        Authorization: token,
      },
      body,
      json: true,
    }, (err, response, responseBody) => {
      if (err) {
        log.fatal({ err }, 'error sending request');
        return reject('Error happened');
      }

      if (response.statusCode >= 400) {
        if (responseBody && responseBody.message) {
          return reject(responseBody.message);
        }

        log.error({ statusCode: response.statusCode }, 'error updating request');
        return reject('error happened');
      }

      return resolve('request updated');
    });
  });
};
