const keystone = require('keystone');

const Trophy = keystone.list('Trophy');
const log = require('../../utils/logger')({ name: 'routes.admin' });

module.exports = function index(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;

  locals.page = req.params.page;
  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.section = `Help | ${locals.page}`;
  locals.description = 'Get help about how to use the site. See requirements for broadcasting, chat commands and chat room moderation information';
  locals.user = req.user;

  const pages = [
    'cams',
    'chat',
    'mod',
    'room',
    'reporting',
    'trophies',
    'safety',
    'ageverify',
  ];

  view.on('init', async (next) => {
    if (!locals.page || !pages.includes(locals.page)) {
      return res.redirect(301, '/help/cams');
    }

    if (locals.page === 'trophies') {
      try {
        locals.trophies = await Trophy.model
          .find({ type: { $nin: ['TYPE_OCCASION', 'TYPE_MEMBER_DURATION'] } })
          .exec();

        locals.trophies = locals.trophies.sort((a, b) => {
          const aType = a.type;
          const bType = b.type;
          if (aType === bType) {
            return 0;
          }

          return aType > bType ? 1 : -1;
        });
        return next();
      } catch (err) {
        log.fatal({ err });
        res.status(500).send();
      }
    } else {
      return next();
    }
  });

  // Render the view
  view.render('help');
};
