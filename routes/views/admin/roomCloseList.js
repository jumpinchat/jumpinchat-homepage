const keystone = require('keystone');
const request = require('request');
const jwt = require('jsonwebtoken');
const log = require('../../../utils/logger')({ name: 'routes.adminRoomCloseList' });
const config = require('../../../config');

const RoomClose = keystone.list('RoomClose');
const {
  api,
  errors,
  banReasons,
} = require('../../../constants/constants');

module.exports = function adminRoomCloseList(req, res) {
  let token;
  const view = new keystone.View(req, res);
  const { locals } = res;

  const roomName = req.params.room;
  const { userListId } = req.params;

  locals.section = 'Admin | Room closures';
  locals.page = 'roomclosures';
  locals.user = req.user;
  locals.roomCloses = [];

  view.on('init', async (next) => {
    token = await jwt.sign({ userId: String(locals.user._id) }, config.auth.jwtSecret, { expiresIn: '1h' });
    const roomCloses = await RoomClose.model
      .find({})
      .sort('-createdAt');

    locals.roomCloses = roomCloses;

    return next();
  });

  view.render('admin/roomCloseList');
};
