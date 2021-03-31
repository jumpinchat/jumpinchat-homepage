const keystone = require('keystone');
const request = require('request');
const log = require('./logger')({ name: 'roomUtils' });
const config = require('../config');
const { colours, errors, api } = require('../constants/constants');

const Room = keystone.list('Room');
const RecentRooms = keystone.list('RecentRooms');

/**
 * Get a count of the number of active rooms
 *
 * @param {Function} cb
 */
module.exports.getRoomCount = function getRoomCount(cb) {
  Room.model
    .count({
      $or: [
        { users: { $gt: [] } },
        { 'attrs.owner': { $ne: null } },
      ],
    })
    .where('attrs.active', true)
    .where('settings.public', true)
    .exec(cb);
};

/**
 * Get a list of rooms, with a start and end for pagination.
 *
 * @param {Number} start
 * @param {Number} end
 * @param {Function} cb
 * @returns {Array}
 */
module.exports.getRoomList = function getRoomList(start = 0, end = 9, cb) {
  return request({
    method: 'GET',
    url: `${api}/api/rooms/public?start=${start}&end=${end}`,
    headers: {
      Authorization: config.auth.sharedSecret,
    },
    json: true,
  }, (err, response, body) => {
    if (err) {
      log.fatal({ err }, 'error fetching room list');
      return cb(err);
    }

    if (response.statusCode >= 400) {
      if (body && body.message) {
        log.error({ message: body.message }, 'error getting room list');
        return cb(body.message);
      }

      log.error({ statusCode: response.statusCode }, 'error getting room list');
      return cb('error');
    }

    const data = {
      ...body,
      rooms: body.rooms.map((room, i) => Object.assign({}, room, {
        color: colours[i % colours.length],
      })),
    };

    return cb(null, data);
  });
};

module.exports.getRoomByName = function getRoomByName(name, cb) {
  const query = Room.model
    .findOne({ name })
    .populate({
      path: 'settings.moderators.user_id',
      select: ['username', 'profile.pic'],
    })
    .populate({
      path: 'settings.moderators.assignedBy',
      select: ['username', 'profile.pic'],
    });
  if (cb) {
    return query.exec(cb);
  }

  return query.exec();
};

module.exports.getRoomById = function getRoomByName(id) {
  return Room.model
    .findOne({ _id: id })
    .exec();
};

module.exports.adminGetRoomList = function adminGetRoomList(token, page, cb) {
  return request({
    method: 'GET',
    url: `${api}/api/admin/rooms?page=${page}`,
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
      return cb(errors.ERR_SRV);
    }

    return cb(null, body);
  });
};

module.exports.sendBan = async function sendBan(token, reason, { restrictBroadcast = false, restrictJoin = false }, user, expires, reportId) {
  return new Promise((resolve, reject) => {
    const {
      session_id,
      user_id,
      ip,
      socket_id,
    } = user;

    const body = {
      userId: user_id,
      sessionId: session_id,
      ip,
      restrictBroadcast,
      restrictJoin,
      socketId: socket_id,
      reason,
      expires,
      reportId,
    };

    return request({
      method: 'POST',
      url: `${api}/api/admin/siteban`,
      headers: {
        Authorization: token,
      },
      body,
      json: true,
    }, (err, response, responseBody) => {
      if (err) {
        log.fatal({ err }, 'error sending request');
        return reject(errors.ERR_SRV);
      }

      if (response.statusCode >= 400) {
        if (responseBody && responseBody.message) {
          return reject(responseBody.message);
        }

        log.error({ statusCode: response.statusCode }, 'error sending site ban');
        return reject(errors.ERR_SRV);
      }

      return resolve('User banned');
    });
  });
};

module.exports.getRecentRooms = function getRecentRooms(user) {
  return RecentRooms
    .model
    .findOne({ user })
    .populate('rooms.roomId')
    .lean()
    .exec();
};

module.exports.getRoomEmoji = function getRoomEmoji(roomName) {
  return new Promise((resolve, reject) => request({
    method: 'GET',
    url: `${api}/api/rooms/${roomName}/emoji`,
    json: true,
  }, (err, response, responseBody) => {
    if (err) {
      log.fatal({ err }, 'error sending request');
      return reject(errors.ERR_SRV);
    }

    if (response.statusCode >= 400) {
      if (responseBody && responseBody.message) {
        return reject(responseBody.message);
      }

      log.error({ statusCode: response.statusCode }, 'error sending site ban');
      return reject(errors.ERR_SRV);
    }

    return resolve(responseBody);
  }));
};

module.exports.checkUserIsMod = function checkUserIsMod(userId, room) {
  const { moderators } = room.settings;

  const isMod = moderators.some((m) => {
    const mod = String(userId) === String(m.user_id);
    const isPerm = String(m.assignedBy) === String(room.attrs.owner) || !m.assignedBy;
    return mod && isPerm;
  });

  const isOwner = String(room.attrs.owner) === String(userId);

  return isMod || isOwner;
};
