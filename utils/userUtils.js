/**
 * Created by Zaccary on 23/03/2017.
 */

const keystone = require('keystone');
const bcrypt = require('bcrypt');
const request = require('request');
const requestIp = require('request-ip');
const log = require('./logger')({ name: 'utils.userUtils' });
const { api, errors } = require('../constants/constants');

const User = keystone.list('User');

module.exports.getRemoteIpFromReq = function getRemoteIpFromReq(req) {
  const ip = requestIp.getClientIp(req);
  return ip;
};

/**
 * Get a user by a unique ID. Takes a `lean` parameter which
 * will return a simple object if true.
 *
 * @param {String} userId
 * @param {Boolean} lean
 * @param cb
 */
module.exports.getUserById = (userId, lean = true, cb) => {
  const query = User.model
    .findOne({ _id: userId })
    .lean(lean);


  if (cb) {
    return query.exec((err, user) => {
      if (err) {
        log.error(`Could not get user ${userId}`, err);
        return cb(err);
      }

      if (!user) {
        log.warn('User not found');
        return cb();
      }

      return cb(err, user);
    });
  }

  return query.exec();
};

module.exports.searchUserByUsername = (term, lean = true, cb) => {
  const re = new RegExp(term, 'i');
  const query = User.model
    .find({
      username: {
        $regex: re,
      },
    })
    .limit(10)
    .lean(lean);

  if (!cb) {
    return query;
  }

  return query.exec(cb);
};

module.exports.getUserByUsername = (username, cb) => {
  const query = User.model.findOne({ username });

  if (cb) {
    return query.exec((err, user) => {
      if (err) {
        log.error(`Could not get user ${username}`, err);
        return cb(err);
      }

      if (!user) {
        log.warn(`User "${username}" not found`);
        return cb();
      }

      return cb(err, user);
    });
  }

  return query.exec();
};

/**
 * Generate a bcrypt hash from a string.
 *
 * @param password
 * @param cb
 */
module.exports.generatePassHash = (password, cb) => bcrypt.genSalt(10, (err, salt) => {
  if (err) {
    log.fatal('error generating salt', err);
    return cb(err);
  }

  return bcrypt.hash(password, salt, (hashErr, hash) => {
    if (hashErr) {
      log.fatal('error creating password hash', hashErr);
      return cb(hashErr);
    }

    return cb(null, hash);
  });
});

module.exports.adminGetUserCount = function adminGetUserCount(cb) {
  return User.model.count().exec(cb);
};

module.exports.adminGetUsers = function adminGetUsers(token, page, cb) {
  return request({
    method: 'GET',
    url: `${api}/api/admin/users?page=${page}`,
    headers: {
      Authorization: token,
    },
    json: true,
  }, (err, response, body) => {
    if (err) {
      log.error({ err }, 'error happened');
      return cb(err);
    }

    if (response.statusCode >= 400) {
      if (body && body.message) {
        return cb(body.message);
      }

      log.error({ statusCode: response.statusCode }, 'error getting room list');
      return cb('error');
    }

    return cb(null, body);
  });
};

module.exports.adminApplyTrophy = function adminGetUsers(token, userId, trophyName) {
  return new Promise((resolve, reject) => request({
    method: 'PUT',
    url: `${api}/api/trophy/apply/${userId}`,
    headers: {
      Authorization: token,
    },
    body: {
      trophyName,
    },
    json: true,
  }, (err, response, body) => {
    if (err) {
      log.error({ err }, 'error happened');
      return reject(err);
    }

    if (response.statusCode >= 400) {
      if (body && body.message) {
        return reject(body.message);
      }

      log.error({ statusCode: response.statusCode }, 'error getting room list');
      return reject(new Error(errors.ERR_SRV));
    }

    return resolve(body);
  }));
};
