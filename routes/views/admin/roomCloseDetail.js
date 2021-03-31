const keystone = require('keystone');
const log = require('../../../utils/logger')({ name: 'routes.roomCloseDetail' });
const config = require('../../../config');

const RoomClose = keystone.list('RoomClose');
const {
  api,
  errors,
  banReasons,
} = require('../../../constants/constants');

module.exports = function adminRoomCloseList(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  const { closeId } = req.params;

  locals.section = `Admin | Room closures ${closeId}`;
  locals.page = 'roomclosures';
  locals.user = req.user;
  locals.banlist = [];

  view.on('init', async (next) => {
    const close = await RoomClose.model.findOne({ _id: closeId });

    locals.close = close;

    return next();
  });

  view.render('admin/roomCloseDetail');
};
