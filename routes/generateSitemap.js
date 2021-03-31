const keystone = require('keystone');
const sm = require('sitemap');
const log = require('../utils/logger')({ name: 'generateSitemap' });

const Room = keystone.list('Room');

const staticRoutes = [
  { url: '/', changefreq: 'always', priority: 0.8 },
  { url: '/login', changefreq: 'weekly' },
  { url: '/register', changefreq: 'weekly', priority: 0.7 },
  { url: '/terms', changefreq: 'monthly' },
  { url: '/privacy', changefreq: 'monthly' },
  { url: '/help/cams', changefreq: 'weekly' },
  { url: '/help/chat', changefreq: 'weekly' },
  { url: '/help/mod', changefreq: 'weekly' },
  { url: '/contact', changefreq: 'monthly' },
  { url: '/directory', changefreq: 'always' },
];

module.exports = function generateSitemap(req, res) {
  return Room.model
    .find({ 'attrs.owner': { $ne: null } })
    .where('attrs.active', true)
    .where('settings.public', true)
    .lean()
    .exec((err, rooms) => {
      if (err) {
        log.fatal({ err }, 'Could not get room list');
        return res.status(500).end();
      }

      const sitemap = sm.createSitemap({
        hostname: 'https://jumpin.chat',
        cacheTime: 1000 * 60 * 60,
        urls: [
          ...staticRoutes,
          ...rooms.map((room) => {
            let url = {
              url: `/${room.name}`,
              changefreq: 'daily',
            };

            if (room.settings.display) {
              let img = {
                url: `https://s3.amazonaws.com/jic-uploads/${room.settings.display}`,
                title: room.name,
              };

              if (room.settings.description) {
                img = Object.assign(img, {
                  caption: room.settings.description,
                });
              }

              url = Object.assign(url, { img });
            }

            return url;
          }),
        ],
      });

      return sitemap.toXML((err, xml) => {
        if (err) {
          log.fatal({ err }, 'failed to generate sitemap');
          return res.status(500).end();
        }

        res.header('Content-Type', 'application/xml');
        return res.status(200).send(xml);
      });
    });
};
