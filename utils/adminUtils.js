const keystone = require('keystone');
const moment = require('moment');
const request = require('request');
const { groupBy } = require('lodash');
const config = require('../config');
const log = require('./logger')({ name: 'routes.admin' });
const { api } = require('../constants/constants');

const Stats = keystone.list('Stats');

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getStubData(length) {
  const data = [];
  for (let i = length; i >= 0; i -= 1) {
    data.push({
      x: new Date(Date.now() - (1000 * 60 * 15 * i)).toISOString(),
      y: getRandomIntInclusive(0, 50),
    });
  }

  return data;
}

function formatData(data) {
  const userData = data.map(s => ({
    x: s.createdAt,
    y: s.rooms.reduce((acc, r) => acc += r.users, 0),
  }));

  const broadcasterData = data.map(s => ({
    x: s.createdAt,
    y: s.rooms.reduce((acc, r) => acc += r.broadcasters, 0),
  }));

  return [userData, broadcasterData];
}

function mergeData(data, unit) {
  const groupedResults = groupBy(data, ({ x }) => moment(x).startOf(unit));

  return Object.entries(groupedResults)
    .map(([label, groupedData]) => {
      const sum = groupedData.reduce((acc, { y }) => acc += y, 0);
      const avg = (sum > 0 && data.length > 0)
        ? sum / groupedData.length
        : 0;

      return {
        x: new Date(label).toISOString(),
        y: Math.round(avg),
      };
    });
}

function getLimitedData(data, limit) {
  return data.filter(d => moment(d.createdAt).isAfter(moment(limit)));
}

module.exports.getStats = function getStats() {
  const diff = 1000 * 60 * 60 * 24 * 7 * 4;
  const limit = new Date(Date.now() - diff);
  return Stats.model
    .find({
      createdAt: {
        $gte: limit,
      },
    })
    .exec();
};

module.exports.getStatsDay = function getStatsDay(stats) {
  const diff = 1000 * 60 * 60 * 24;
  const limit = new Date(Date.now() - diff).toISOString();

  // if (config.env === 'development') {
  //  return [getStubData(96), getStubData(96)].map(v => mergeData(v, 'hour'));
  // }

  const limitedStats = getLimitedData(stats, limit);

  return formatData(limitedStats).map(v => mergeData(v, 'hour'));
};

module.exports.getStatsWeek = function getStatsWeek(stats) {
  const diff = 1000 * 60 * 60 * 24 * 7;
  const limit = new Date(Date.now() - diff).toISOString();

  // if (config.env === 'development') {
  //  return [getStubData(672), getStubData(672)].map(v => mergeData(v, 'day'));
  // }

  const limitedStats = getLimitedData(stats, limit);
  return formatData(limitedStats).map(v => mergeData(v, 'day'));
};

module.exports.getStatsMonth = function getStatsMonth(stats) {
  const diff = 1000 * 60 * 60 * 24 * 7 * 4;
  const limit = new Date(Date.now() - diff).toISOString();

  // if (config.env === 'development') {
  //  return [getStubData(2688), getStubData(2688)].map(v => mergeData(v, 'day'));
  // }

  const limitedStats = getLimitedData(stats, limit);
  return formatData(limitedStats).map(v => mergeData(v, 'day'));
};

module.exports.getBanItem = function getBanItem(token, id) {
  return new Promise((resolve, reject) => request({
    method: 'GET',
    url: `${api}/api/admin/siteban/${id}`,
    headers: {
      Authorization: token,
    },
    json: true,
  }, (err, response, responseBody) => {
    if (err) {
      log.fatal({ err }, 'error sending request');
      return reject(err);
    }

    if (response.statusCode >= 400) {
      if (responseBody && responseBody.message) {
        return reject(responseBody.message);
      }

      log.error({ statusCode: response.statusCode }, 'error fetching site ban');
      return reject(new Error('server error'));
    }

    return resolve(responseBody);
  }));
};

module.exports.getSiteMods = function getSiteMods(token) {
  return new Promise((resolve, reject) => request({
    method: 'GET',
    url: `${api}/api/admin/sitemods`,
    headers: {
      Authorization: token,
    },
    json: true,
  }, (err, response, responseBody) => {
    if (err) {
      log.fatal({ err }, 'error sending request');
      return reject(err);
    }

    if (response.statusCode >= 400) {
      if (responseBody && responseBody.message) {
        return reject(responseBody.message);
      }

      log.error({ statusCode: response.statusCode }, 'error fetching site mods');
      return reject(new Error('server error'));
    }

    return resolve(responseBody);
  }));
};

module.exports.addSiteMod = function addSiteMod(token, username) {
  return new Promise((resolve, reject) => request({
    method: 'POST',
    url: `${api}/api/admin/sitemod`,
    headers: {
      Authorization: token,
    },
    body: {
      username,
    },
    json: true,
  }, (err, response, responseBody) => {
    if (err) {
      log.fatal({ err }, 'error sending request');
      return reject(err);
    }

    if (response.statusCode >= 400) {
      if (responseBody && responseBody.message) {
        return reject(responseBody.message);
      }

      log.error({ statusCode: response.statusCode }, 'error fetching site mods');
      return reject(new Error('server error'));
    }

    return resolve(responseBody);
  }));
};

module.exports.removeSiteMod = function removeSiteMod(token, modId) {
  return new Promise((resolve, reject) => request({
    method: 'DELETE',
    url: `${api}/api/admin/sitemod/${modId}`,
    headers: {
      Authorization: token,
    },
    json: true,
  }, (err, response, responseBody) => {
    if (err) {
      log.fatal({ err }, 'error sending request');
      return reject(err);
    }

    if (response.statusCode >= 400) {
      if (responseBody && responseBody.message) {
        return reject(responseBody.message);
      }

      log.error({ statusCode: response.statusCode }, 'error removing site mod');
      return reject(new Error('Server error'));
    }

    return resolve(responseBody);
  }));
};

module.exports.getModActivity = function getModActivity(token, page) {
  return new Promise((resolve, reject) => request({
    method: 'GET',
    url: `${api}/api/admin/modactivity?page=${page}`,
    headers: {
      Authorization: token,
    },
    json: true,
  }, (err, response, responseBody) => {
    if (err) {
      log.fatal({ err }, 'error sending request');
      return reject(err);
    }

    if (response.statusCode >= 400) {
      if (responseBody && responseBody.message) {
        return reject(responseBody.message);
      }

      log.error({ statusCode: response.statusCode }, 'error fetching mod activity');
      return reject(new Error('server error'));
    }

    return resolve(responseBody);
  }));
};
