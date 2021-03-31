const keystone = require('keystone');
const url = require('url');
const Joi = require('joi');
const log = require('../../utils/logger')({ name: 'views.home' });
const { getRoomList, getRecentRooms } = require('../../utils/roomUtils');
const { colours, errors } = require('../../constants/constants');

const generateLdJson = rooms => ({
  '@context': 'http://schema.org',
  '@type': 'ItemList',
  itemListElement: rooms.map((room, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: room.name,
    image: room.settings.display
      ? `https://s3.amazonaws.com/jic-uploads/${room.settings.display}`
      : undefined,
    url: `https://jumpin.chat/${room.name}`,
    description: room.settings.description,
  })),
});

module.exports = function index(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;

  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.section = 'Simple video chat rooms';
  locals.rooms = [];
  locals.recentRooms = [];
  locals.roomListError = false;
  locals.user = req.user;
  locals.ldJson = {};

  view.on('init', async (next) => {
    if (req.user) {
      try {
        const recentRoomResponse = await getRecentRooms(req.user._id);
        if (recentRoomResponse) {
          locals.recentRooms = recentRoomResponse.rooms
            .filter(({ roomId: room }) => Boolean(room))
            .sort((a, b) => a.createdAt < b.createdAt)
            .map(({ roomId: room }, i) => {
              const broadcastingUsers = room.users.filter(u => u.isBroadcasting === true).length;
              return {
                ...room,
                color: colours[i % colours.length],
                attrs: {
                  ...room.attrs,
                  broadcastingUsers,
                },
              };
            });
        }
      } catch (err) {
        log.fatal({ err }, 'failed to get recent rooms');
        return res.status(500).send();
      }
    }

    return getRoomList(0, 9, (err, data) => {
      if (err) {
        log.error({ err }, 'failed to get room list');
        return next(err);
      }

      const { rooms } = data;

      locals.rooms = rooms;

      locals.ldJson = generateLdJson(rooms);
      return next();
    });
  });

  view.on('get', { action: 'room.get' }, () => {
    res.redirect(`/${req.query.roomname}`);
  });

  view.on('post', { action: 'custom' }, async () => {
    const schema = Joi.object().keys({
      amount: Joi.number().integer().min(3).max(50),
    });

    try {
      const {
        amount,
      } = await Joi.validate({ amount: req.body.amount }, schema);

      return res.redirect(`/support/payment?productId=onetime&amount=${amount * 100}`);
    } catch (err) {
      log.error({ err }, 'error validating custom amount form');
      locals.error = errors.ERR_VALIDATION;
      return res.redirect(url.format({
        path: './',
        query: {
          error: locals.error,
        },
      }));
    }
  });

  // Render the view
  view.render('index');
};
