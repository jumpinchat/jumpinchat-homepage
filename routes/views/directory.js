const keystone = require('keystone');
const Pagination = require('pagination-object');
const log = require('../../utils/logger')({ name: 'views.directory' });
const { getRoomList, getRoomCount } = require('../../utils/roomUtils');

module.exports = function directory(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  const resultsPerPage = 9;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.section = 'Room list';
  locals.description = 'Browse existing chat rooms. Rooms are ordered by user count and most recent activity.';
  locals.rooms = [];
  locals.roomListError = false;
  locals.user = req.user;
  locals.page = req.query.page || 1;
  locals.roomCount = 0;
  locals.pagination = null;

  view.on('init', (next) => {
    const start = ((locals.page - 1) * resultsPerPage);

    return getRoomList(start, resultsPerPage, (err, data) => {
      if (err) {
        return next(err);
      }

      const { rooms, count } = data;

      if (count > 0) {
        locals.pagination = new Pagination({
          currentPage: Number(locals.page),
          totalItems: count,
          itemsPerPage: resultsPerPage,
          rangeLength: 9,
        });
      }

      locals.rooms = rooms;
      return next();
    });
  });

  view.on('get', { action: 'room.get' }, (next) => {
    res.redirect(`/${req.query.roomname}`);
    next();
  });

  // Render the view
  view.render('directory');
};
