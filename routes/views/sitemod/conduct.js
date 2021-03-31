const keystone = require('keystone');

module.exports = function siteModConduct(req, res) {
  const view = new keystone.View(req, res);
  const { locals } = res;
  locals.section = 'Site Mod | Code of Conduct';
  locals.page = 'conduct';

  view.on('init', next => next());

  view.render('sitemod/conduct');
};
