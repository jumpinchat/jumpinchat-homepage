const keystone = require('keystone');
const request = require('request');
const log = require('./logger')({ name: 'utils.reportUtils' });
const { api } = require('../constants/constants');

module.exports.getReports = function getReports(token, page, cb) {
  return request({
    method: 'GET',
    url: `${api}/api/report?page=${page}`,
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

module.exports.getReportById = function getReports(token, id, cb) {
  return request({
    method: 'GET',
    url: `${api}/api/report/${id}`,
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

module.exports.getMessageReports = function getMessageReports(token, page, cb) {
  return request({
    method: 'GET',
    url: `${api}/api/report/message?page=${page}`,
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

      log.error({ statusCode: response.statusCode }, 'error getting reports');
      return cb('error');
    }

    return cb(null, body);
  });
};

module.exports.getMessageReportById = function getMessageReportById(token, id, cb) {
  return request({
    method: 'GET',
    url: `${api}/api/report/message/${id}`,
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

module.exports.setReportResolved = function setReportResolved(token, reportId) {
  return new Promise((resolve, reject) => request({
    method: 'POST',
    url: `${api}/api/report/resolve`,
    headers: {
      Authorization: token,
    },
    body: {
      reportId,
    },
    json: true,
  }, (err, response, body) => {
    if (err) {
      log.fatal({ err }, 'error happened');
      return reject(err);
    }

    if (response.statusCode >= 400) {
      if (body && body.message) {
        return reject(body.message);
      }

      log.error({ statusCode: response.statusCode }, 'error updating report');
      return reject(new Error(`${response.statusCode} error updating report`));
    }

    return resolve(body);
  }));
};
